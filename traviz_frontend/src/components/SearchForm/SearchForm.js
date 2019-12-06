import React from "react"
import "./SearchForm.css"
import TagService from "../../services/TagService/TagService";
import Select from 'react-select';
import { Form, Button } from 'react-bootstrap'
import TraceService from "../../services/TraceService/TraceService";


export class SearchForm extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      tags: [],
      traceId: null,
      tag: null,
      startDate: null,
      endDate: null,
      minDur: null,
      maxDur: null
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.tagService = new TagService()
    this.traceService = new TraceService()
  }

  componentWillMount() {
    this.tagService.getAllTags().then(ts => {
      let tgs = [{ label: "None", Value: "None" }];
      let newTags = ts.map(t => ({
        label: t,
        value: t
      }));
      tgs = tgs.concat(newTags);
      this.setState({ tags: tgs })
    })
  }

  handleChange(event) {
    this.setState({ value: event.target.value });
  }

  handleSubmit(event) {
    this.traceService.searchTraces(this.state.traceId, 
      this.state.tag, 
      this.state.startDate, 
      this.state.endDate, 
      this.state.minDur, 
      this.state.maxDur).then(traces => {
        console.log(traces)
      })
    event.preventDefault();
  }

  render() {

    return (
      <Form onSubmit={this.handleSubmit}>

        <Form.Group controlId="traceId">
          <Form.Label> Trace Id </Form.Label>
          <Form.Control type="text" placeholder="e.g. A276C4D06FDB9AE0" onChange={this.handleChange} value={this.state.traceId} />
        </Form.Group>

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