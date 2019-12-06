import React, { Component } from "react"
import TraceService from "../../services/TraceService/TraceService";

export class Table extends Component {
    constructor(props) {
        super(props);
        this.state = {
            traces: []
        };
        this.traceService = new TraceService()
    }

    componentDidMount() {
        this.traceService.getAllTraces().then(traces => {
            this.state.traces = traces
            console.log(traces)
        })
    }

    render() {
        let traces = this.state.traces
        console.log(traces)
        return (
            <div>
                <table>
                    {traces.map(row => {
                        return <tr key={row.id}>
                            <td>{row.option}</td>
                            <td>{row.type}</td>
                        </tr>
                    })}
                </table>
            </div>
        );
    }
}

export default Table;