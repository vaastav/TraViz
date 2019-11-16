import React from "react";
import { Grid } from "react-flexbox-grid";
import { SourceDashboard } from "../../dc/sourceDashboard";

class Source extends React.Component {
    render() {
        return (
            <div>
                <Grid>
                    <SourceDashboard />
                </Grid>
            </div>
        );
    }
}

export default Source