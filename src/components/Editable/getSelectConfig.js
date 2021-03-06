import { SALUTATION_OPTIONS, GENDER_OPTIONS } from 'lib/constants';

// We set up predefined parameters to reduce the amount of
// configuration options when calling Editable components.
const selectConfig = {
  accounts: {
    model: 'accounts',
    display: 'name',
    ordering: 'name',
    empty: 'Not linked to any accounts'
  },
  assignedTo: {
    model: 'users',
    display: 'fullName',
    ordering: 'firstName',
    empty: 'Nobody'
  },
  assignedToTeams: {
    model: 'users/team',
    display: 'name',
    ordering: 'name'
  },
  teams: {
    model: 'users/team',
    display: 'name',
    ordering: 'name'
  },
  type: {
    model: 'cases/types'
  },
  priority: {
    model: 'cases/priorities',
    choiceField: true,
    display: 'priorityDisplay',
    iconDisplay: 'name'
  },
  nextStep: {
    model: 'deals/next-steps',
    iconDisplay: 'position'
  },
  foundThrough: {
    model: 'deals/found-through'
  },
  whyLost: {
    model: 'deals/why-lost'
  },
  whyCustomer: {
    model: 'deals/why-customer'
  },
  contactedBy: {
    model: 'deals/contacted-by'
  },
  status: {
    model: '/statuses'
  },
  salutation: {
    options: SALUTATION_OPTIONS,
    display: 'salutationDisplay',
    choiceField: true
  },
  gender: {
    options: GENDER_OPTIONS,
    display: 'genderDisplay',
    choiceField: true
  }
};

export default function getSelectConfig(field) {
  return selectConfig[field];
}
