import React from "react";
import { Switch, Route } from "react-router-dom";
import Home from "../../pages/Home/Home";
import ComparisonPage from "../../pages/Comparison/ComparisonPage";
import DependenciesPage from "../../pages/Dependencies/DependenciesPage";
import SourcePage from "../../pages/Source/SourcePage"

import "./Main.css";

function Main() {
    return (
        <main>
            <Switch>
                <Route exact path="/" component={Home} />
                <Route path="/comparison/" component={ComparisonPage} />
                <Route path="/dependencies/:id" component={DependenciesPage} />
                <Route path="/source/" component={SourcePage} />
            </Switch>
        </main>
    );
}

export default Main;