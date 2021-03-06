import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { DEFAULT_LABELS, INBOX_LABEL } from 'lib/constants';
import getColorCode from 'utils/getColorCode';
import Settings from 'models/Settings';
import EmailAccount from 'models/EmailAccount';

class EmailAccounts extends Component {
  constructor(props) {
    super(props);

    this.mounted = false;
    this.settings = new Settings('inbox');

    this.state = {
      currentEmailAccount: props.currentEmailAccount,
      currentLabel: props.currentLabel,
      emailAccounts: [],
      collapsed: { emailAccounts: {}, labels: {} }
    };
  }

  static getDerivedStateFromProps = nextProps => ({
    currentEmailAccount: nextProps.currentEmailAccount,
    currentLabel: nextProps.currentLabel || {}
  });

  async componentDidMount() {
    this.mounted = true;

    const settingsResponse = await this.settings.get();
    const accountRequest = await EmailAccount.mine();
    const emailAccounts = accountRequest.results.map(emailAccount => {
      // Sort the labels by name.
      emailAccount.labels = emailAccount.labels.sort((a, b) => a.name.localeCompare(b.name));
      emailAccount.labels = emailAccount.labels.filter(label => label.labelType !== 0);

      const labelList = [];
      let previousLabel = null;

      emailAccount.labels.forEach(label => {
        label.children = [];

        if (!label.parent) {
          // Initial indentation level.
          label.level = 0;
        }

        let addToList = true;

        if (previousLabel) {
          const parent = this.getParent(previousLabel, label);

          if (parent) {
            // Increase indentation level.
            label.level = parent.level + 1;
            parent.children.push(label);
            // It's a child, so don't render it as part of the list,
            // but part of the parent.
            addToList = false;
          }
        }

        previousLabel = label;

        if (addToList) {
          labelList.push(label);
        }
      });

      emailAccount.labels = labelList;

      return emailAccount;
    });

    if (this.mounted) {
      this.setState({ emailAccounts, ...settingsResponse.results });
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  getParentLabelName = label => {
    let name = '';

    if (label.parent) {
      name = this.getParentLabelName(label.parent);
    }

    name += `${label.name}/`;

    return name;
  };

  getParent = (parentLabel, label) => {
    const parentLabelName = this.getParentLabelName(parentLabel);

    let parent;

    if (label.name.includes(parentLabelName)) {
      // We've reached the final parent and it seems the label is a child.
      parent = parentLabel;
      label.name = label.name.replace(parentLabelName, '');
    } else if (parentLabel.parent) {
      // The given parentLabel doesn't seem to be the label's parent.
      // So recursively check if the given parent's parent is the label's parent.
      parent = this.getParent(parentLabel.parent, label);
    }

    if (parent) {
      label.parent = parent;
    }

    return parent;
  };

  labelRenderer = (emailAccount, label) => {
    const { collapsed, currentLabel } = this.state;
    const isCollapsed = collapsed.labels[label.id];
    const className = `email-account-label${
      currentLabel && currentLabel.id === label.id ? ' active' : ''
    }`;
    // Construct the label's class with a padding of 15 per depth level.
    const labelClassName = `email-label p-l-${15 + label.level * 15}`;

    return (
      <React.Fragment>
        <div className={className}>
          <button
            className={labelClassName}
            onClick={() => this.props.setInbox(emailAccount, label)}
          >
            {label.name}
          </button>

          {label.children.length > 0 && (
            <button onClick={() => this.toggleLabel(label.id)} className="hl-interface-btn m-r-5">
              <FontAwesomeIcon
                icon={['far', isCollapsed ? 'angle-down' : 'angle-up']}
                className="m-l-5"
              />
            </button>
          )}
        </div>

        {label.children.length > 0 && !isCollapsed && (
          <ul>
            {label.children.map(child => (
              <li key={child.id}>{this.labelRenderer(emailAccount, child)}</li>
            ))}
          </ul>
        )}
      </React.Fragment>
    );
  };

  toggleLabel = async label => {
    const { collapsed } = this.state;

    collapsed.labels[label] = !collapsed.labels[label];

    await this.settings.store({ collapsed });
    this.setState({ collapsed });
  };

  toggleCollapse = async emailAccount => {
    const { collapsed } = this.state;

    collapsed.emailAccounts[emailAccount] = !collapsed.emailAccounts[emailAccount];

    await this.settings.store({ collapsed });
    this.setState({ collapsed });
  };

  render() {
    const { collapsed, currentEmailAccount, currentLabel, emailAccounts } = this.state;
    const isAllCollapsed = collapsed.all;

    const inboxLabel = DEFAULT_LABELS.find(label => label.labelId === INBOX_LABEL);

    return (
      <div>
        <div className="label-list">
          <div className="list-header no-border">
            <button
              className={`label-name${!currentEmailAccount ? ' account-selected' : ''}`}
              onClick={() => this.props.setInbox(null, inboxLabel)}
            >
              All mailboxes
            </button>

            <button className="hl-interface-btn" onClick={() => this.toggleCollapse('all')}>
              <FontAwesomeIcon icon={['far', isAllCollapsed ? 'angle-down' : 'angle-up']} />
            </button>
          </div>

          {!isAllCollapsed && (
            <ul>
              {DEFAULT_LABELS.map(label => {
                const defaultLabelClass = `email-account-label${
                  !currentEmailAccount && currentLabel.labelId === label.labelId ? ' active' : ''
                }`;

                return (
                  <li key={`default-${label.labelId}`}>
                    <div className={defaultLabelClass}>
                      <button
                        className="email-label"
                        onClick={() => this.props.setInbox(null, label)}
                      >
                        {label.name}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {emailAccounts.map(emailAccount => {
          const isSelected = currentEmailAccount && emailAccount.id === currentEmailAccount.id;
          const isCollapsed = collapsed.emailAccounts[emailAccount.id];
          const color = emailAccount.color || getColorCode(emailAccount.emailAddress);

          return (
            <div key={emailAccount.id} className="label-list">
              <div className="list-header" style={{ borderLeftColor: color }}>
                <button
                  className={`label-name${isSelected ? ' account-selected' : ''}`}
                  onClick={() => this.props.setInbox(emailAccount, inboxLabel)}
                >
                  {emailAccount.label}
                </button>

                <button
                  className="hl-interface-btn"
                  onClick={() => this.toggleCollapse(emailAccount.id)}
                >
                  <FontAwesomeIcon icon={['far', isCollapsed ? 'angle-down' : 'angle-up']} />
                </button>
              </div>

              {!isCollapsed && (
                <React.Fragment>
                  {emailAccount.isSyncing && (
                    <div
                      className="email-account-syncing"
                      tooltip="Fetching your email. This could take a moment"
                    >
                      Importing your email
                    </div>
                  )}

                  <ul>
                    {DEFAULT_LABELS.map(label => {
                      const defaultLabelClass = `email-account-label${
                        isSelected && currentLabel.labelId === label.labelId ? ' active' : ''
                      }`;

                      return (
                        <li key={`default-${emailAccount.id}-${label.labelId}`}>
                          <div className={defaultLabelClass}>
                            <button
                              className="email-label"
                              onClick={() => this.props.setInbox(emailAccount, label)}
                            >
                              {label.name}
                            </button>
                          </div>
                        </li>
                      );
                    })}

                    {emailAccount.labels.map(label => (
                      <li key={label.id}>{this.labelRenderer(emailAccount, label)}</li>
                    ))}
                  </ul>
                </React.Fragment>
              )}
            </div>
          );
        })}
      </div>
    );
  }
}

export default withTranslation('tooltips')(EmailAccounts);
