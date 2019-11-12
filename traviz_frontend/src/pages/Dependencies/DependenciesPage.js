import React from "react";
import TraceService from "../../services/TraceService/TraceService";

class DependenciesPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            trace: {}
        };

        this.traceService = new TraceService();
    }

    componentDidMount() {
        const id = this.props.match.params.id;

        this.traceService.getTrace(id).then(response => {
            this.setState({ trace: response});
        });
    }

    render() {
        const trace = this.state.trace;
        return (
            <div>
                <h2>Dependencies:</h2>
            </div>
        )
    }
}

export default DependenciesPage;