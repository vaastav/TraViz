import React from "react";
import SourceService from "../../services/SourceService/SourceService";

class SourcePage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            source: {}
        };

        this.SourceService = new SourceService();
    }

    componentDidMount() {
        const id = this.props.match.params.id;
        console.log("Inside component did mount");
        this.SourceService.getSource(id).then(response => {
            console.log(response)
            this.setState({ source: response});
        });
    }

    render() {
        const source = this.state.source;
        console.log("Inside render");
        return (
            <div>
                <h2>Source:</h2>
            </div>
        )
    }
}

export default SourcePage;