import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import { NO_SORT_STATUS } from 'lib/constants';
import List from 'components/List';
import ColumnDisplay from 'components/List/ColumnDisplay';
import ListActions from 'components/List/ListActions';
import LilyPagination from 'components/LilyPagination';
import ListColumns from 'components/List/ListColumns';
import ListFilter from 'components/List/ListFilter';
import DueDateFilter from 'components/DueDateFilter';
import BlockUI from 'components/Utils/BlockUI';
import LilyDate from 'components/Utils/LilyDate';
import Settings from 'models/Settings';
import Deal from 'models/Deal';

class DealList extends Component {
  constructor(props) {
    super(props);

    this.settings = new Settings('dealList');

    const columns = [
      { key: 'name', text: 'Subject', selected: true },
      { key: 'client', text: 'Client', selected: true },
      { key: 'status', text: 'Status', selected: true, sort: 'status.name' },
      { key: 'lostReason', text: 'Lost reason', selected: false, sort: 'whyLost' },
      { key: 'nextStep', text: 'Next step', selected: false, sort: 'nextStep.name' },
      { key: 'nextStepDate', text: 'Next step date', selected: true, sort: 'nextStepDate' },
      { key: 'assignedTo', text: 'Assigned to', selected: true, sort: 'assignedTo.fullName' },
      { key: 'assignedTeams', text: 'Assigned team(s)', selected: true },
      { key: 'amountOnce', text: 'One-time cost', selected: true, sort: 'amountOnce' },
      { key: 'amountRecurring', text: 'Recurring costs', selected: true, sort: 'amountRecurring' },
      { key: 'newBusiness', text: 'Business', selected: true, sort: 'newBusiness' },
      { key: 'created', text: 'Created', selected: true, sort: 'created' },
      { key: 'closedDate', text: 'Closed date', selected: false, sort: 'closedDate' },
      { key: 'createdBy', text: 'Created by', selected: true, sort: 'createdBy.fullName' },
      { key: 'tags', text: 'Tags', selected: true }
    ];

    this.state = {
      columns,
      deals: [],
      nextSteps: [],
      filters: { list: [], dueDate: [], user: [] },
      pagination: {},
      loading: true,
      page: 1,
      sortColumn: '',
      sortStatus: NO_SORT_STATUS
    };

    document.title = 'Deals - Lily';
  }

  async componentDidMount() {
    const settingsResponse = await this.settings.get();
    const nextStepResponse = await Deal.nextSteps();
    const nextSteps = nextStepResponse.results.map(nextStep => {
      nextStep.value = `nextStep.id: ${nextStep.id}`;
      return nextStep;
    });
    await this.loadItems();

    this.setState({
      ...settingsResponse.results,
      nextSteps,
      loading: false
    });
  }

  setPage = async page => {
    this.setState({ page }, this.loadItems);
  };

  setSorting = (sortColumn, sortStatus) => {
    this.setState({ sortColumn, sortStatus }, this.loadItems);
  };

  setFilters = async filters => {
    await this.settings.store({ filters });

    this.setState({ filters }, this.loadItems);
  };

  toggleColumn = async index => {
    const { columns } = this.state;

    columns[index].selected = !columns[index].selected;

    await this.settings.store({ columns });

    this.setState({ columns });
  };

  loadItems = async () => {
    const { page, sortColumn, sortStatus } = this.state;

    this.setState({ loading: true });

    const data = await Deal.query({
      pageSize: 20,
      page,
      sortColumn,
      sortStatus
    });

    this.setState({
      deals: data.results,
      pagination: data.pagination,
      loading: false
    });
  };

  render() {
    const {
      columns,
      deals,
      nextSteps,
      filters,
      loading,
      pagination,
      sortColumn,
      sortStatus
    } = this.state;

    return (
      <BlockUI blocking={loading}>
        <List>
          <div className="list-header">
            <ColumnDisplay columns={columns} toggleColumn={this.toggleColumn} />

            <ListFilter
              label="Next steps"
              items={nextSteps}
              filters={filters}
              setFilters={this.setFilters}
            />

            <DueDateFilter filters={filters} setFilters={this.setFilters} />
          </div>
          <table className="hl-table">
            <thead>
              <tr>
                <ListColumns
                  columns={columns}
                  setSorting={this.setSorting}
                  sortColumn={sortColumn}
                  sortStatus={sortStatus}
                />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map(deal => (
                <tr key={deal.id}>
                  {columns[0].selected && (
                    <td>
                      <Link to={`/deals/${deal.id}`}>{deal.name}</Link>
                    </td>
                  )}
                  {columns[1].selected && (
                    <td>
                      {deal.contact && (
                        <Link to={`/contacts/${deal.contact.id}`}>{deal.contact.fullName}</Link>
                      )}
                      {deal.contact && deal.account && ' at '}
                      {deal.account && (
                        <Link to={`/accounts/${deal.account.id}`}>{deal.account.name}</Link>
                      )}
                    </td>
                  )}
                  {columns[2].selected && <td>{deal.status.name}</td>}
                  {columns[3].selected && <td>{deal.whyLost && deal.whyLost.name}</td>}
                  {columns[4].selected && (
                    <td>
                      <i
                        className={`lilicon hl-prio-icon-${deal.nextStep.name.toLowerCase()} m-r-5`}
                      />
                      {deal.nextStep.name}
                    </td>
                  )}
                  {columns[5].selected && (
                    <td>
                      <LilyDate date={deal.nextStepDate} />
                    </td>
                  )}
                  {columns[6].selected && (
                    <td>{deal.assignedTo ? deal.assignedTo.fullName : ''}</td>
                  )}
                  {columns[7].selected && (
                    <td>
                      {deal.assignedToTeams.map(team => (
                        <div key={team.id}>{team.name}</div>
                      ))}
                    </td>
                  )}
                  {columns[8].selected && <td>{deal.amountOnce}</td>}
                  {columns[9].selected && <td>{deal.amountRecurring}</td>}
                  {columns[10].selected && <td>{deal.newBusiness ? 'New' : 'Existing'}</td>}
                  {columns[11].selected && (
                    <td>
                      <LilyDate date={deal.created} />
                    </td>
                  )}
                  {columns[12].selected && <td>{deal.closedDate}</td>}
                  {columns[13].selected && (
                    <td>{deal.createdBy ? deal.createdBy.fullName : 'Unknown'}</td>
                  )}
                  {columns[14].selected && (
                    <td>
                      {deal.tags.map(tag => (
                        <div key={tag.id}>{tag.name}</div>
                      ))}
                    </td>
                  )}
                  <td>
                    <ListActions object={deal} {...this.props} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="list-footer">
            <LilyPagination setPage={this.setPage} pagination={pagination} page={this.state.page} />
          </div>
        </List>
      </BlockUI>
    );
  }
}

export default DealList;
