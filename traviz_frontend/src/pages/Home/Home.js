import React from "react";
import { Grid } from "react-flexbox-grid";
import { Dashboard } from "../../dc/dashboard";
import "./Home.css"

class Home extends React.Component {

    render() {
        return (
            <div className="outer-div">
                <Grid>
                    <Dashboard />
                </Grid>
            </div>
        );
    }
}

export default Home

