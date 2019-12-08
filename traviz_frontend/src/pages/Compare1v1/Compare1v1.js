import React from "react";
import CompareGraph from "../../components/CompareGraph/CompareGraph";

class Compare1v1 extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <CompareGraph trace1={this.props.match.params.trace1} trace2={this.props.match.params.trace2} />
            </div>
        );
    }
}

export default Compare1v1
