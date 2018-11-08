import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { withNamespaces } from 'react-i18next';

import withContext from 'src/withContext';
import timeCategorize from 'utils/timeCategorize';
import updateModel from 'utils/updateModel';
import ContentBlock from 'components/ContentBlock';
import Postpone from 'components/Postpone';
import ClientDisplay from 'components/Utils/ClientDisplay';
import LoadingIndicator from 'components/Utils/LoadingIndicator';
import LilyCurrency from 'components/Utils/LilyCurrency';
import UserFilter from 'components/UserFilter';
import DueDateFilter from 'components/DueDateFilter';
import LilyTooltip from 'components/LilyTooltip';
import Settings from 'models/Settings';
import Deal from 'models/Deal';

class MyDeals extends Component {
  constructor(props) {
    super(props);

    this.settings = new Settings('myDeals');

    this.state = {
      items: [],
      filters: { dueDate: [], user: [] },
      loading: true
    };
  }

  async componentDidMount() {
    const settingsResponse = await this.settings.get();

    await this.loadItems();

    this.setState({ ...settingsResponse.results });
  }

  loadItems = async () => {
    this.setState({ loading: true });

    const request = await Deal.query();
    const total = request.results.length;
    const items = timeCategorize(request.results, 'expires', this.props.currentUser);

    this.setState({ items, total, loading: false });
  };

  setFilters = async filters => {
    await this.settings.store({ filters });

    this.setState({ filters }, this.loadItems);
  };

  acceptDeal = async item => {
    this.setState({ loading: true });

    const args = {
      id: item.id,
      newlyAssigned: false
    };

    await updateModel(item, args);
    await this.loadItems();
  };

  render() {
    const { items, total, filters, loading } = this.state;
    const { currentUser, t } = this.props;

    const hasCompleted = filters.dueDate.length > 0 && filters.user.length > 0;

    const title = (
      <React.Fragment>
        <div className="content-block-label deals" />
        <div className="content-block-name">
          <i className="lilicon hl-deals-icon m-r-5" />
          My deals
          <span className="label-amount">{total || '-'}</span>
        </div>
      </React.Fragment>
    );

    const extra = (
      <React.Fragment>
        <DueDateFilter filters={filters} setFilters={this.setFilters} />

        <UserFilter filters={filters} setFilters={this.setFilters} />
      </React.Fragment>
    );

    const acceptTooltip = t('tooltips:newlyAssignedDeal');
    const categories = [];

    Object.keys(items).forEach(key => {
      const newlyAssigned = key === 'newlyAssigned';

      const tbody = (
        <tbody key={key}>
          {items[key].length > 0 && (
            <tr className="table-category">
              {newlyAssigned ? (
                <td colSpan="8">Newly assigned to you</td>
              ) : (
                <td colSpan="8" className="text-capitalize">
                  {key}
                </td>
              )}
            </tr>
          )}
          {items[key].map(item => (
            <tr key={item.id} className={newlyAssigned ? 'newly-assigned' : ''}>
              <td>
                <Link to={`/deals/${item.id}`}>{item.name}</Link>
              </td>
              <td>
                <ClientDisplay contact={item.contact} account={item.account} />
              </td>
              <td>
                {item.amountOnce !== 0 && (
                  <span>
                    <LilyCurrency value={item.amountOnce} currency={item.currency} /> /month
                  </span>
                )}
                {item.amountOnce !== 0 && item.amountRecurring !== 0 && <span> | </span>}
                {item.amountRecurring !== 0 && (
                  <span>
                    <LilyCurrency value={item.amountRecurring} currency={item.currency} />{' '}
                    /recurring
                  </span>
                )}
              </td>
              <td>{item.status.name}</td>
              <td>{item.nextStep.name}</td>
              <td>
                <Postpone object={item} field="nextStepDate" />
              </td>
              <td>
                {newlyAssigned && (
                  <button
                    className="hl-primary-btn round"
                    onClick={() => this.acceptDeal(item)}
                    data-tip={acceptTooltip}
                  >
                    <FontAwesomeIcon icon="check" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      );

      categories.push(tbody);
    });

    return (
      <ContentBlock title={title} extra={extra} component="myDeals" expandable closeable>
        <table className="hl-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Client</th>
              <th>Deal size</th>
              <th>Status</th>
              <th>Next step</th>
              <th>Next step date</th>
              <th>Actions</th>
            </tr>
          </thead>

          {categories}

          {total === 0 && (
            <tbody>
              <tr>
                <td colSpan="8">
                  {hasCompleted ? (
                    <span>{t('emptyStates:dashboard.myDealsCompleted')}</span>
                  ) : (
                    <span>No deals</span>
                  )}
                </td>
              </tr>
            </tbody>
          )}
        </table>

        {loading && <LoadingIndicator />}

        {currentUser.objectCounts.deals === 0 && (
          <div className="empty-state-description">
            <p>{t('emptyStates:dashboard.myDeals')}</p>
          </div>
        )}

        <LilyTooltip />
      </ContentBlock>
    );
  }
}

export default withNamespaces(['emptyStates', 'tooltips'])(withContext(MyDeals));
