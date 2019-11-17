import React from "react";
import { Grid } from "react-flexbox-grid";
import Swimlane from "../../components/Swimlane/Swimlane"

class TraceEvents extends React.Component {

    render() {
        return (
            <div>
                <Grid>
                    <Swimlane />
                </Grid>
            </div>
        );
    }
}

export default TraceEvents

