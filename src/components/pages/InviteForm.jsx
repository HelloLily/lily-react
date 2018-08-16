import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { withFormik } from 'formik';
import cx from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { INVITE_EMPTY_ROW } from 'lib/constants';
import withContext from 'src/withContext';
import BlockUI from 'components/Utils/BlockUI';
import FormSection from 'components/Utils/FormSection';
import FormFooter from 'components/Utils/FormFooter';
import UserInvite from 'models/UserInvite';

class InnerInviteForm extends Component {
  addRow = () => {
    const { invites } = this.props.values;

    invites.push(INVITE_EMPTY_ROW);

    this.props.setFieldValue({ invites });
  };

  handleChange = (value, index, field) => {
    const { invites } = this.props.values;

    invites[index][field] = value;

    this.props.setFieldValue({ invites });
  };

  render() {
    const { values, errors, isSubmitting, handleSubmit } = this.props;

    return (
      <BlockUI blocking={isSubmitting}>
        <div className="content-block-container">
          <div className="content-block">
            <div className="content-block-header">
              <div className="content-block-name">Send invites</div>
            </div>

            <div className="content-block-content">
              <form onSubmit={handleSubmit}>
                <FormSection>
                  {values.invites.map((item, index) => {
                    const hasError =
                      Object.keys(errors).length > 0 && errors[index] && errors[index].name;
                    const rowClassName = cx('editable-related-row', {
                      'is-deleted': item.isDeleted,
                      'has-error': hasError
                    });

                    return (
                      <div className={rowClassName} key={item.id || `row-${index}`}>
                        <input
                          autoFocus
                          type="text"
                          value={item.firstName}
                          onChange={event =>
                            this.handleChange(event.target.value, index, 'firstName')
                          }
                          className="editable-input"
                          placeholder="First name"
                        />

                        <input
                          type="text"
                          value={item.email}
                          onChange={event => this.handleChange(event.target.value, index, 'email')}
                          className="editable-input m-l-10 m-r-10"
                          placeholder="Email address"
                        />

                        <div className="form-related-actions">
                          <button
                            className="hl-primary-btn m-r-10"
                            onClick={() => this.toggleDelete(item, index)}
                            type="button"
                          >
                            {item.isDeleted ? (
                              <FontAwesomeIcon icon="undo" />
                            ) : (
                              <i className="lilicon hl-trashcan-icon" />
                            )}
                          </button>

                          {index === values.invites.length - 1 && (
                            <button className="hl-primary-btn" onClick={this.addRow} type="button">
                              <FontAwesomeIcon icon="plus" />
                            </button>
                          )}
                        </div>

                        {hasError && <div className="error-message">{errors[index].name}</div>}
                      </div>
                    );
                  })}
                </FormSection>

                <FormFooter {...this.props} confirmText="Send invite(s)" />
              </form>
            </div>
          </div>
        </div>
      </BlockUI>
    );
  }
}

const InviteForm = withRouter(
  withFormik({
    mapPropsToValues: () => ({
      invites: [INVITE_EMPTY_ROW]
    }),
    handleSubmit: (values, { props, setSubmitting, setErrors }) => {
      const request = UserInvite.post(values);

      request
        .then(() => {
          props.history.push('/preferences/users');
        })
        .catch(errors => {
          setErrors(errors.data.invites);
          setSubmitting(false);
        });
    },
    displayName: 'InviteForm'
  })(InnerInviteForm)
);

export default withContext(InviteForm);