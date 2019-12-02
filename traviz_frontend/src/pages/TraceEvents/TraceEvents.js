import React from "react";
import { Grid } from "react-flexbox-grid";
import Swimlane from "../../components/Swimlane/Swimlane"

import TraceService from "../../services/TraceService/TraceService";

class TraceEvents extends React.Component {

    constructor(props) {
        super(props);
        this.traceService = new TraceService();
    }

    render() {
        return (
            <div>
                <Grid>
                    <Swimlane id={this.props.match.params.id}/>
                </Grid>
            </div>
        );
    }
}

export default TraceEvents

