import React from "react"
import "./SearchForm.css"


export class SearchForm extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { value: '' };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({ value: event.target.value });
  }

  handleSubmit(event) {
    alert('A name was submitted: ' + this.state.value);
    event.preventDefault();
  }

  render() {

    return (
      <div className="form">
        <form onSubmit={this.handleSubmit}>

          <div className="inputs">
            <div className="input">
              <label>
                Tags:
                <select default="Tags" onChange={this.handleChange}>
                  <option value="1">one</option>
                </select>
              </label>
            </div>

            <div className="date">
              <label>
                Start Time:
          <input type="date" value={this.state.value} onChange={this.handleChange} />
              </label>
            </div>

            <div className="date">
              <label>
                End Time:
          <input type="date" value={this.state.value} onChange={this.handleChange} />
              </label>
            </div>

            <div className="input">
              <label>
                Min Duration:
          <input type="text" value={this.state.value} onChange={this.handleChange} />
              </label>
            </div>

            <div className="input">
              <label>
                Max Duration:
          <input type="text" value={this.state.value} onChange={this.handleChange} />
              </label>
            </div>
          </div>

          <div className="submit">
            <input type="submit" value="Search" />
          </div>

        </form >
      </div>

    );
  }
}

export default SearchForm