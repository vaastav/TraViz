import React from "react";
import { DependencyContext } from "../../dc/depContext";
import { DepGraphWrapper } from "../../dc/DepGraphWrapper";

class Dependency extends React.Component {
    render() {
        return (
            <div>
                <DependencyContext >
                    <DepGraphWrapper />
                </DependencyContext >
            </div>
        );
    }
}

export default Dependency
