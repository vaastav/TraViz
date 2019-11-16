import React from "react";
import { Grid } from "react-flexbox-grid";
import { Dashboard } from "../../dc/dashboard";
import Swimlane  from "../../components/Swimlane/Swimlane";

class Home extends React.Component {

    render() {
        return (
            <div>
               <Grid>
                   <Dashboard />
               </Grid>
               <div>
                    <Swimlane />
               </div>
            </div>
        );
    }
}

export default Home;

