import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { withRouter } from 'react-router-dom';
import { withFormik } from 'formik';

import { get } from 'lib/api';
import formatPhoneNumber from 'utils/formatPhoneNumber';
import BlockUI from 'components/Utils/BlockUI';
import FormSection from 'components/Utils/FormSection';
import User from 'models/User';

class InnerProfileForm extends Component {
  async componentDidMount() {
    const user = await User.me();

    this.props.setValues(user);
  }

  render() {
    const { values, errors, dirty, isSubmitting, handleChange, handleSubmit } = this.props;

    return (
      <BlockUI blocking={isSubmitting}>
        <div className="content-block-container">
          <div className="content-block">
            <div className="content-block-header">
              <div className="content-block-name">My profile</div>
            </div>

            <div className="content-block-content">
              <form onSubmit={handleSubmit}>
                <FormSection header="Personal information">
                  <div className={`form-field${errors.firstName ? ' has-error' : ''}`}>
                    <label htmlFor="firstName" required>
                      First name
                    </label>
                    <input
                      id="firstName"
                      placeholder="First name"
                      type="text"
                      value={values.firstName}
                      onChange={handleChange}
                    />

                    {errors.firstName && <div className="error-message">{errors.firstName}</div>}
                  </div>

                  <div className={`form-field${errors.lastName ? ' has-error' : ''}`}>
                    <label htmlFor="lastName" required>
                      Last name
                    </label>
                    <input
                      id="lastName"
                      placeholder="Last name"
                      type="text"
                      value={values.lastName}
                      onChange={handleChange}
                    />

                    {errors.lastName && <div className="error-message">{errors.lastName}</div>}
                  </div>

                  <div className={`form-field${errors.position ? ' has-error' : ''}`}>
                    <label htmlFor="position">Position</label>
                    <input
                      id="position"
                      placeholder="Position"
                      type="text"
                      value={values.position}
                      onChange={handleChange}
                    />

                    {errors.position && <div className="error-message">{errors.position}</div>}
                  </div>

                  <div className={`form-field${errors.picture ? ' has-error' : ''}`}>
                    <label htmlFor="picture">Picture</label>

                    {values.picture && <img src={values.picture} alt="User avatar" />}

                    <input
                      id="picture"
                      type="file"
                      value={values.picture}
                      onChange={handleChange}
                    />

                    {errors.picture && <div className="error-message">{errors.picture}</div>}

                    <p className="text-muted small m-t-10">Maximum picture size is 300kb.</p>
                  </div>
                </FormSection>

                <FormSection header="Contact information">
                  <div className={`form-field${errors.phoneNumber ? ' has-error' : ''}`}>
                    <label htmlFor="phoneNumber" required>
                      Phone number
                    </label>
                    <input
                      id="phoneNumber"
                      placeholder="Phone number"
                      type="text"
                      value={values.phoneNumber}
                      onChange={handleChange}
                    />

                    {errors.phoneNumber && (
                      <div className="error-message">{errors.phoneNumber}</div>
                    )}
                  </div>

                  <div className={`form-field${errors.internalNumber ? ' has-error' : ''}`}>
                    <label htmlFor="internalNumber" required>
                      Internal number
                    </label>
                    <input
                      id="internalNumber"
                      placeholder="Internal number"
                      type="text"
                      value={values.internalNumber}
                      onChange={handleChange}
                    />

                    {errors.internalNumber && (
                      <div className="error-message">{errors.internalNumber}</div>
                    )}
                  </div>
                </FormSection>

                <div className="form-footer">
                  <button type="submit" disabled={isSubmitting} className="hl-primary-btn-blue">
                    <FontAwesomeIcon icon="check" /> Save
                  </button>

                  <button
                    type="button"
                    className="hl-primary-btn m-l-10"
                    disabled={!dirty || isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </BlockUI>
    );
  }
}

const ProfileForm = withRouter(
  withFormik({
    mapPropsToValues: () => ({
      firstName: '',
      lastName: '',
      position: '',
      picture: '',
      phoneNumber: '',
      internalNumber: ''
    }),
    // validationSchema: Yup.object().shape({
    //   email: Yup.string()
    //     .email('Invalid email address')
    //     .required('Email is required!'),
    // }),
    handleSubmit: (values, { props, setSubmitting, setErrors }) => {
      // Show message if notifications are supported by the browser, but haven't been accepted/declined.
      if (
        'Notification' in window &&
        Notification.permission !== 'granted' &&
        Notification.permission !== 'denied'
      ) {
        // TODO: Temporary.
        alert(
          'For our call integration, we need your browsers permission to send you notifications. Please allow these notifications to make complete use of our call integration.'
        );
        Notification.requestPermission(() => {
          console.log('Accepted');
        });
      } else {
        // Otherwise just save the data.
      }

      const request = User.patch(values);

      request
        .then(response => {
          // props.history.push(`/accounts/${response.id}`);
        })
        .catch(errors => {
          setErrors(errors.data);
          setSubmitting(false);
        });
    },
    displayName: 'ProfileForm'
  })(InnerProfileForm)
);

export default ProfileForm;
