import React from "react";
import { Graph } from "react-d3-graph"
import AggregateService from "../../services/AggregateService/AggregateService";

class AggregateGraph extends React.Component {
    constructor(props) {
        super(props);
        console.log(props.tid_list);
        this.state = {
            traces: props.tid_list,
            loading: false,
            hasData: false,
            data: null
        };
        this.aggregateService = new AggregateService();
    }

    componentDidMount() {
        if (this.state.hasData) {
            return
        }
        if (this.state.loading) {
            return
        }
        this.setState({loading:true});
        const traces = this.state.traces;
        this.aggregateService.getAggregate(traces).then(graph => {
            console.log(graph)
            this.setState({loading:false, hasData: true});
        });
    }

    render() {
        return (
            <div> 
                <h3>TODO: Implement</h3>
            </div>
        );
    }
}

export default AggregateGraph
