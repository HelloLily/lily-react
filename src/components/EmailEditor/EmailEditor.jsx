import React, { Component } from 'react';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { withTranslation } from 'react-i18next';
import * as JsDiff from 'diff';

import withContext from 'src/withContext';
import {
  EMAIL_REGEX,
  VARIABLE_REGEX,
  TYPED_TEXT_REGEX,
  SELECT_STYLES,
  NEW_MESSAGE
} from 'lib/constants';
import { get } from 'lib/api';
import { errorToast, successToast } from 'utils/toasts';
import LilyEditor from 'components/LilyEditor';
import EmailAccount from 'models/EmailAccount';
import EmailTemplate from 'models/EmailTemplate';
import EmailMessage from 'models/EmailMessage';
import RecipientField from './RecipientField';

// Styling overrides for selects in the editor component.
const styles = {
  ...SELECT_STYLES,
  control: (base, state) => ({
    ...base,
    background: '#fff',
    minHeight: '34px',
    boxShadow: '0',
    borderRadius: '0',
    borderColor: state.isFocused ? '#27244c' : '#fff',
    '&:hover': {
      borderColor: state.isFocused ? '#27244c' : '#fff'
    }
  })
};

class EmailEditor extends Component {
  constructor(props) {
    super(props);

    this.editorRef = React.createRef();

    this.state = {
      subject: '',
      recipients: [],
      recipientsCc: [],
      recipientsBcc: [],
      errors: {},
      modalOpen: false,
      action: props.messageType || NEW_MESSAGE
    };
  }

  async componentDidMount() {
    const { subject } = this.state;
    const { emailAddress, recipients = [], documentId, currentUser } = this.props;

    const state = {
      recipients: [],
      recipientsCc: [],
      recipientsBcc: []
    };

    if (emailAddress) {
      state.recipients.push({ value: { emailAddress }, label: emailAddress });
    }

    if (recipients) {
      recipients.forEach((recipient, index) => {
        const data = {
          value: recipient,
          label: this.createRecipientLabel(recipient.emailAddress, recipient.fullName)
        };

        if (index > 1) {
          // More than 1 recipient so it's most likely a reply all.
          state.recipientsCc.push(data);
        } else {
          state.contact = recipient;
          state.recipients.push(data);
        }
      });
    }

    let initialTemplate = this.props.template;

    const accountResponse = await EmailAccount.query();
    const emailAccounts = accountResponse.results.map(account => {
      const label = `${account.label} (${account.emailAddress})`;

      return { value: account, label };
    });

    // If an initial email account passed load it.
    // Otherwise check if the user has set a primary email account.
    const initialEmailAccount =
      this.props.emailAccount || currentUser.primaryEmailAccount
        ? currentUser.primaryEmailAccount.id
        : null;

    if (initialEmailAccount) {
      const emailAccount = emailAccounts.find(account => account.value.id === initialEmailAccount);

      state.emailAccount = emailAccount;

      if (emailAccount.defaultTemplate) {
        initialTemplate = emailAccount.defaultTemplate.id;
      }
    }

    state.emailAccounts = emailAccounts;

    const templateResponse = await EmailTemplate.query();
    const templates = templateResponse.results.map(template => ({
      value: template,
      label: template.name
    }));

    // A template was passed to the editor component, so load that instead of the default.
    if (this.props.loadDefaultTemplate && initialTemplate) {
      const foundTemplate = templates.find(template => template.value.id === initialTemplate);

      state.template = foundTemplate;

      // Only overwrite the subject if a new message is being created.
      if (this.state.action === NEW_MESSAGE) {
        state.subject = subject;
      }

      this.loadTemplate(foundTemplate.value.bodyHtml, subject, foundTemplate.value.customVariables);
    }

    state.templates = templates;

    // The PandaDoc API call always requires an email address,
    // so only continue if a recipient has been passed as a prop.
    if (documentId && state.recipients.length > 0) {
      try {
        const documentResponse = await this.getDocument(
          documentId,
          state.recipients[0].value.emailAddress
        );

        state.document = documentResponse.document;
      } catch (error) {
        errorToast(error.response.error);
      }
    }

    this.setState(state);
  }

  async getDocument(documentId, recipient = '') {
    return get(`/integrations/documents/${documentId}/send/?recipient=${recipient}`);
  }

  async getCustomVariable(variable, isPublic = false) {
    return get(`/messaging/email/template-variables/?name=${variable}&public=${isPublic}`);
  }

  getValueForVariable = cleanedVariable => {
    const [model, field] = cleanedVariable.split('.');
    let value = null;

    const modelObject = this.state[model];

    if (modelObject) {
      value = modelObject.hasOwnProperty('value') ? modelObject.value[field] : modelObject[field];
    }

    return value;
  };

  handleEmailAccountChange = emailAccount => {
    const { currentUser } = this.props;

    currentUser.currentEmailAddress = emailAccount ? emailAccount.value.emailAddress : null;

    this.setState({ emailAccount, currentUser });
  };

  handleRecipientChange = recipients => {
    const newState = { recipients, menuOpen: false };

    if (recipients.length === 1) {
      const contact = recipients[0];
      newState.contact = contact;

      if (contact.value.accounts && contact.value.accounts.length === 1) {
        [newState.account] = contact.value.accounts;
      } else {
        newState.account = null;
      }
    } else if (recipients.length === 0) {
      newState.contact = null;
      newState.account = null;
    }

    this.setState(newState, this.scanTemplate);
  };

  handleAdditionalRecipients = (recipients, bcc = false) => {
    if (bcc) {
      this.setState({ recipientsBcc: recipients });
    } else {
      this.setState({ recipientsCc: recipients });
    }
  };

  handleSubjectChange = event => {
    this.setState({ subject: event.target.value });
  };

  handleTemplateChange = template => {
    const { currentTemplate, action, emailMessage } = this.state;
    const { t } = this.props;

    let loadTemplate = true;

    // Check if a template has been loaded already.

    if (currentTemplate) {
      // TODO: Temporary.
      loadTemplate = confirm(t('modals:email.overwriteTemplateConfirm'));
    }

    if (template) {
      let typedText = '';

      if (currentTemplate) {
        // Create a HTMLDocument from the given HTML string.
        const parser = new DOMParser();
        const currentDocument = parser.parseFromString(currentTemplate, 'text/html');
        const document = parser.parseFromString(this.editorRef.current.getHtml(), 'text/html');
        // Get the root element of the document.
        const templateContent = currentDocument.body.innerHTML;
        const documentContent = document.body.innerHTML;

        // Create a character diff between the loaded template's HTML and the actual current HTML.
        const diff = JsDiff.diffWords(templateContent, documentContent);

        diff.forEach(part => {
          // Get all text that was changed/added.
          if (part.added) {
            typedText += part.value;
          }
        });

        if (typedText.indexOf('>') === 0) {
          // When there's a line break a bracket from the previous element is seen as a diff.
          // So just replace it if it's part of the diff.
          typedText = typedText.substr(1);
        }

        if (typedText.lastIndexOf('</') === typedText.length - 2) {
          // Same goes for any line breaks at the end.
          typedText = typedText.substr(0, typedText.length - 2);
        }
      }

      if (loadTemplate) {
        const { bodyHtml, customVariables } = template.value;
        const subject = action === NEW_MESSAGE ? template.value.subject : emailMessage.subject;

        this.setState({ subject, template });
        this.loadTemplate(bodyHtml, subject, customVariables, typedText);
      }
    } else {
      this.setState({
        template: null,
        subject: ''
      });

      // TODO: This needs some more checks to prevent completely clearing the editor.
      this.editorRef.current.setHtml('');
    }
  };

  scanTemplate = () => {
    const currentHtml = this.editorRef.current.getHtml();
    // Create a HTMLDocument from the given HTML string.
    const parser = new DOMParser();
    const parsed = parser.parseFromString(currentHtml, 'text/html');
    // Get the root element of the document.
    const container = parsed.documentElement;
    const links = container.querySelectorAll('a');
    const specialVariableRegex = /{{ ([a-z]+\.[a-z_]+) }}/g;
    const { specialElements } = this.state;

    // Certain elements need to be processed differently.
    Array.from(links).forEach(link => {
      const { key } = link.dataset;

      if (specialElements.hasOwnProperty(key)) {
        const originalHtml = specialElements[key];
        const newHtml = originalHtml.replace(
          specialVariableRegex,
          (match, p1) => this.getValueForVariable(p1) || `{{ ${p1} }}`
        );

        link.outerHTML = newHtml;

        specialElements[key] = originalHtml;
      }
    });

    this.setState({ specialElements });

    // Get all the template variables.
    const variables = container.querySelectorAll('[data-variable]');

    Array.from(variables).forEach(variable => {
      // Convert back to a variable if the value has been cleared (e.g. recipient removed).
      variable.innerHTML =
        this.getValueForVariable(variable.dataset.variable) || `[[ ${variable.dataset.variable} ]]`;
    });

    this.editorRef.current.setHtml(container.outerHTML);
  };

  loadTemplate = (html, subject = '', customVariables = [], typedText = '') => {
    const currentHtml = html || this.editorRef.current.getHtml();
    const specialElements = {};

    // Regex to find variables which need special processing (e.g. variables in links).
    const specialVariableRegex = /{{ ?([a-z]+\.[a-z_]+) ?}}/g;

    // Create a HTMLDocument from the given HTML string.
    const parser = new DOMParser();
    const parsed = parser.parseFromString(currentHtml, 'text/html');
    // Get the root element of the document.
    const container = parsed.documentElement;
    const links = container.querySelectorAll('a');

    let newHtml = container.outerHTML;

    Array.from(links).forEach(link => {
      let addLink = false;

      // Generate some random string to clean up the keys of the special elements object.
      const key =
        Math.random()
          .toString(36)
          .substring(2, 15) +
        Math.random()
          .toString(36)
          .substring(2, 15);

      // Add the randomly generated key to the link's data attributes.
      link.dataset.key = key;

      // Replace all square brackets with normal ones.
      // This is because not every element can contain our special variable span.
      // This "original" HTML will be stored so it can be parsed again later.
      const originalHtml = link.outerHTML.replace(VARIABLE_REGEX, (match, p1) => `{{ ${p1} }}`);

      const linkHtml = originalHtml.replace(specialVariableRegex, (match, p1) => {
        const value = this.getValueForVariable(p1) || `{{ ${p1} }}`;

        // Only store data for links which contain template variables.
        addLink = true;

        return value;
      });

      if (addLink) {
        link.outerHTML = linkHtml;
        specialElements[key] = originalHtml;
      }
    });

    // Save the special elements so their data can be used later.
    this.setState({ specialElements });

    if (!TYPED_TEXT_REGEX.test(newHtml) && typedText) {
      container.innerHTML += typedText;
    }

    newHtml = container.outerHTML;

    customVariables.forEach(variable => {
      // Replace any custom variables before we scan for regular template variables.
      const customVariableRegex = new RegExp(`\\[\\[ ?(custom.${variable.variable}) ?\\]\\]`, 'g');

      newHtml = newHtml.replace(customVariableRegex, () => variable.text);
    });

    // Replace typed text variable with actual text (or leave empty).
    newHtml = newHtml.replace('[[ template.typed_text ]]', typedText);
    // Replace all regular template variables.
    newHtml = newHtml.replace(VARIABLE_REGEX, (match, p1) => {
      // If no value is found we leave the template variable so we can attempt to fill it in later.
      const value = this.getValueForVariable(p1) || match;

      return `<span data-variable="${p1}">${value}</span>`;
    });

    if (subject) {
      const newSubject = subject.replace(
        VARIABLE_REGEX,
        (match, p1) =>
          // If no value is found we leave the template variable
          // so we can attempt to fill it in later.
          this.getValueForVariable(p1) || match
      );

      this.setState({ subject: newSubject });
    }

    this.editorRef.current.setHtml(newHtml);

    // The editor stores the HTML a bit differently than it's created.
    // To ensure we always have the correct format (for comparisons) we retrieve the HTML
    // instead of storing the newly creating HTML.
    this.setState({ currentTemplate: this.editorRef.current.getHtml() });
  };

  checkRecipientValidity = () => {
    const { recipients, recipientsCc, recipientsBcc } = this.state;
    const { t } = this.props;

    // Check if any recipient has been filled in.
    const hasAnyRecipient =
      recipients.length > 0 || recipientsCc.length > 0 || recipientsBcc.length > 0;

    if (!hasAnyRecipient) {
      errorToast(t('toasts:email.emptyRecipients'));
      return false;
    }

    const allRecipients = [...recipients, ...recipientsCc, ...recipientsBcc];

    const validRecipients = allRecipients.every(recipient =>
      EMAIL_REGEX.test(recipient.value.emailAddress)
    );

    if (!validRecipients) {
      errorToast(t('toasts:email.invalidRecipients'));
    }

    return validRecipients;
  };

  createRecipient = (option, type) => {
    // eslint-disable-next-line
    const recipients = this.state[type];

    recipients.push({
      value: {
        emailAddress: option
      },
      label: option
    });

    this.setState({ recipients });
  };

  handleSubmit = async () => {
    const { subject } = this.state;
    const { t } = this.props;

    const recipientsValid = this.checkRecipientValidity();

    // Block the parent UI.
    this.props.setSending(true);

    if (!recipientsValid) {
      // Don't submit and show errors.
      return;
    }

    if (!subject) {
      const shouldSend = confirm(t('modals:email.noSubject'));

      if (!shouldSend) {
        return;
      }
    }

    const recipients = this.state.recipients.map(recipient => recipient.value.emailAddress);
    const recipientsCc = this.state.recipientsCc.map(recipient => recipient.value.emailAddress);
    const recipientsBcc = this.state.recipientsBcc.map(recipient => recipient.value.emailAddress);
    // Creates a container div to read the template variables.
    const container = document.createElement('div');
    container.innerHTML = this.editorRef.current.getHtml();
    // Get all template variables.
    const variables = container.querySelectorAll('[data-variable]');

    let unparsedVariables = 0;

    Array.from(variables).forEach(variable => {
      // Check all variables if they've been parsed.
      const hasMatch = VARIABLE_REGEX.test(variable.innerHTML);

      if (hasMatch) {
        unparsedVariables += 1;
      } else {
        // Remove the variable spans so the email doesn't contain unneeded HTML.
        variable.outerHTML = variable.innerHTML;
      }
    });

    if (unparsedVariables > 0) {
      // Warn the user about any unparsed variables.
      // The user can then choose to fill in the variables anyway or
      // remove the unparsed variables (automatic action).
      // TODO: Actually implement the above.
      alert('Unparsed variables');
      return;
    }

    const bodyHtml = container.innerHTML;
    const args = {
      subject,
      sendFrom: this.state.emailAccount.value.id,
      to: recipients,
      cc: recipientsCc,
      bcc: recipientsBcc,
      body: bodyHtml,
      action: this.state.action
    };

    try {
      const emailDraft = await EmailMessage.post(args);

      await this.setState({ emailDraft });

      this.editorRef.current.uploadFiles();

      await EmailMessage.send(emailDraft.id);

      successToast(t('toasts:email.emailSent'));

      this.props.history.push('/email');
    } catch (error) {
      // TODO: Show a proper error.
      errorToast(t('toasts:error'));
    }

    this.props.setSending(false);
  };

  render() {
    const { showCcInput, showBccInput, emailDraft = null } = this.state;
    const { fixed } = this.props;
    const className = fixed ? 'editor fixed' : 'editor no-border';

    return (
      <div className={className}>
        <React.Fragment>
          {fixed && <div className="editor-header">Compose email</div>}

          <div className="editor-input-group">
            <label>From</label>

            <Select
              name="emailAccount"
              value={this.state.emailAccount}
              onChange={this.handleEmailAccountChange}
              options={this.state.emailAccounts}
              searchable={false}
              className="editor-select-input"
              styles={styles}
            />
          </div>

          <div className="editor-input-group">
            <label>To</label>

            <RecipientField
              name="recipients"
              inputId="recipients"
              recipients={this.state.recipients}
              onChange={this.handleRecipientChange}
              onCreateOption={option => this.createRecipient(option, 'recipients')}
              styles={styles}
            />

            {!showCcInput && (
              <button
                className="hl-primary-btn no-border"
                onClick={() => this.setState({ showCcInput: true })}
                type="button"
                tabIndex="-1"
              >
                Cc
              </button>
            )}
            {!showBccInput && (
              <button
                className="hl-primary-btn no-border"
                onClick={() => this.setState({ showBccInput: true })}
                type="button"
                tabIndex="-1"
              >
                Bcc
              </button>
            )}
          </div>

          {showCcInput && (
            <div className="editor-input-group">
              <label>Cc</label>

              <RecipientField
                name="recipientsCc"
                inputId="recipientsCc"
                recipients={this.state.recipientsCc}
                onChange={this.handleAdditionalRecipients}
                onCreateOption={option => this.createRecipient(option, 'recipientsCc')}
                styles={styles}
              />

              {showCcInput && (
                <button
                  className="hl-primary-btn no-border"
                  onClick={() => this.setState({ showCcInput: false })}
                  type="button"
                >
                  <FontAwesomeIcon icon={['far', 'times']} />
                </button>
              )}
            </div>
          )}

          {showBccInput && (
            <div className="editor-input-group">
              <label>Bcc</label>

              <RecipientField
                name="recipientsBcc"
                inputId="recipientsBcc"
                recipients={this.state.recipientsBcc}
                onChange={recipients => this.handleAdditionalRecipients(recipients, true)}
                onCreateOption={option => this.createRecipient(option, 'recipientsBcc')}
                styles={styles}
              />

              {showBccInput && (
                <button
                  className="hl-primary-btn no-border"
                  onClick={() => this.setState({ showBccInput: false })}
                  type="button"
                >
                  <FontAwesomeIcon icon={['far', 'times']} />
                </button>
              )}
            </div>
          )}

          <div className="editor-input-group">
            <label>Template</label>

            <Select
              name="template"
              value={this.state.template}
              onChange={this.handleTemplateChange}
              options={this.state.templates}
              placeholder="Select a template"
              className="editor-select-input"
              styles={styles}
            />
          </div>

          <div className="editor-input-group no-border">
            <label>Subject</label>

            <input
              type="text"
              className="editor-subject"
              value={this.state.subject}
              onChange={this.handleSubjectChange}
              placeholder="Subject"
            />
          </div>

          <LilyEditor
            ref={this.editorRef}
            codeViewCallback={html => this.loadTemplate(html)}
            maxHeight={this.props.maxHeight}
            modalOpen={this.state.modalOpen}
            closeModal={() => this.setState({ modalOpen: false })}
            emailDraft={emailDraft}
          />
        </React.Fragment>

        <div className="editor-form-actions">
          <button
            className="hl-primary-btn-green no-margin"
            onClick={this.handleSubmit}
            type="submit"
          >
            <FontAwesomeIcon icon={['far', 'check']} /> Send
          </button>

          <div className="separator" />

          <button
            className="hl-primary-btn"
            onClick={() => this.setState({ modalOpen: true })}
            type="button"
          >
            <FontAwesomeIcon icon={['far', 'paperclip']} /> Add attachment
          </button>

          <button className="hl-primary-btn discard-button" type="button">
            <FontAwesomeIcon icon={['far', 'trash-alt']} /> Discard
          </button>
        </div>
      </div>
    );
  }
}

export default withTranslation(['modals', 'toasts'])(withContext(EmailEditor));
