import React from "react";
import { Grid } from "react-flexbox-grid";
import { Dashboard } from "../../DataContext/dashboard";

class Home extends React.Component {

    render() {
        return (
            <div>
               <Grid>
                   <Dashboard />
               </Grid>
            </div>
        );
    }
}

export default Home
