import React from "react";
import { Grid } from "react-flexbox-grid";
import { DashboardCopy } from "../../dc/dashboardcopy";

class HomeCopy extends React.Component {

    render() {
        return (
            <div>
               <Grid>
                   <DashboardCopy />
               </Grid>
            </div>
        );
    }
}

export default HomeCopy

