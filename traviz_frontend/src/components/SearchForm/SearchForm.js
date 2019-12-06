import React from "react"
import "./SearchForm.css"
import TagService from "../../services/TagService/TagService";
import Select from 'react-select';
import { Form, Button } from 'react-bootstrap'


export class SearchForm extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { tags: [] };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.tagService = new TagService()
  }

  componentWillMount() {
    this.tagService.getAllTags().then(ts => {
      let tgs = [{label: "None", Value: "None"}];
      let newTags = ts.map(t => ({
        label: t,
        value: t
      }));
      tgs = tgs.concat(newTags);
      this.setState({tags: tgs})
    })
  }

  handleChange(event) {
    this.setState({ value: event.target.value });
  }

  handleSubmit(event) {
    alert('A name was submitted: ' + this.state.value);
    console.log(event)
    event.preventDefault();
  }

  render() {

    return (
      <Form onSubmit={this.handleSubmit}>

        <Form.Group controlId="tags">
          <Form.Label> Tags </Form.Label>
          <Form.Control as="select" placeholder="Tags" onChange={this.handleChange} options={this.state.tags} value={this.state.tag} >
            {
              this.state.tags.map((option, index) => {
                return (<option key={index} value={option.value}>{option.value}</option>)
              })
            }
          </Form.Control>
        </Form.Group>

        <Form.Group controlId="startDate">
          <Form.Label> Start Date </Form.Label>
          <Form.Control type="date" onChange={this.handleChange} value={this.state.startDate} />
        </Form.Group>

        <Form.Group controlId="endDate">
          <Form.Label> End Date </Form.Label>
          <Form.Control type="date" onChange={this.handleChange} value={this.state.endDate} />
        </Form.Group>

        <Form.Group controlId="minDur">
          <Form.Label> Min Duration </Form.Label>
          <Form.Control type="text" placeholder="e.g. 1.2s, 100ms, 500us" onChange={this.handleChange} value={this.state.minDur} />
        </Form.Group>

        <Form.Group controlId="maxDur">
          <Form.Label> Max Duration </Form.Label>
          <Form.Control type="text" placeholder="e.g. 1.2s, 100ms, 500us" onChange={this.handleChange} value={this.state.maxDur} />
        </Form.Group>

        <Form.Group controlId="submit">
          <Button variant="primary" type="submit">
            Search
          </Button>
        </Form.Group>

      </Form >
    );
  }
}

export default SearchForm