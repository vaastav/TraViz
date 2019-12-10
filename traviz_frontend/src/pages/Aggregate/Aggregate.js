import React from "react";
import AggregateGraph from "../../components/AggregateGraph/AggregateGraph"

class Aggregate extends React.Component {

    constructor(props) {
        super(props);
        var rawTracesList = this.props.location.search.split("=")[1];
        var tid_list = rawTracesList.split("%2C");
        this.state = {
            tid_list: tid_list  
        };
    }

    render() {
        return (
            <div>
                <AggregateGraph tid_list={this.state.tid_list} />
            </div>
        );
    }
}

export default Aggregate
