import React, { Component } from 'react';
import Select, { components } from 'react-select';

import { get } from 'src/lib/api';
import { ESCAPE_KEY } from 'lib/constants';

class EditableIconSelect extends Component {
  constructor(props) {
    super(props);

    this.state = { options: [] };
  }

  async componentDidMount() {
    const { model } = this.props.selectConfig;
    // Fetch data for the given model.
    const request = await get(`/${model}/`);
    const options = this.props.createOptions(request.results);

    this.setState({ options });
  }

  onInputKeyDown = event => {
    if (event.keyCode === ESCAPE_KEY) {
      // Don't blur when Esc is pressed, but cancel the editing.
      event.preventDefault();
    }
  };

  handleChange = selected => {
    const value = selected ? selected.value : null;

    this.props.handleChange(value);

    setTimeout(() => {
      this.props.handleSubmit();
    });
  };

  IconOption = props => {
    return (
      <components.Option {...props}>
        {this.props.createIcon(props.value)}

        {props.label}
      </components.Option>
    );
  };

  render() {
    const { value, createIcon, selectStyles } = this.props;

    let label = value;

    if (value !== null) {
      label = createIcon(value);
    }

    const option = { value, label };

    return (
      <span className="editable-input-wrap">
        <Select
          autoFocus
          name="options"
          className="editable-input"
          value={option}
          styles={selectStyles}
          components={{ Option: this.IconOption }}
          onChange={this.handleChange}
          options={this.state.options}
          onInputKeyDown={this.onInputKeyDown}
          onBlur={this.props.cancel}
          menuPortalTarget={document.body}
        />
      </span>
    );
  }
}

export default EditableIconSelect;
