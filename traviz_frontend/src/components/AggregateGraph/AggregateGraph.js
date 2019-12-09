import React from "react";
import { Graph } from "react-d3-graph"

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
    }

    componentDidMount() {
        if (this.state.hasData) {
            return
        }
        if (this.state.loading) {
            return
        }
        this.setState({loading:true});
        //TODO Use the Aggregate Service to get data
        this.setState({loading:false, hasData: true});
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
