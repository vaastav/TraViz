import React from "react";
import {Grid} from "react-flexbox-grid";
import SpanSwimlane from "../../components/SpanSwimlane/SpanSwimlane";

class TraVista extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <Grid>
                    <SpanSwimlane id={this.props.match.params.id}/>
                </Grid>
            </div>
        )
    }
}

export default TraVista