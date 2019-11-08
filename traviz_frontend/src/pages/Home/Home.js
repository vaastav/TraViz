import React from "react";
import { Link } from "react-router-dom";
import TraceService from "../../services/TraceService/TraceService";

class Home extends React.Component {
    constructor() {
        super();
        this.state = {
            traces: []
        };

        this.traceService = new TraceService();
    }

    compoenentDidMount() {
        this.traceService.getAllTraces().then(response => {
            this.setState({ traces: response});
        });
    }

    renderTraces = () => {
        return this.state.traces.map((trace, id) => {
            return (
                <li id={id}>
                    <Link to={`/dependencies/${trace.id}`}> {trace.tags} </Link>
                </li>
            )
        })
    }

    render() {
        return (
            <div>
                <ul>{this.renderTraces()}</ul>
            </div>
        );
    }
}

export default Home