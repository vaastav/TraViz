import React from "react";
import { DepContext } from "./depContext";
import DepGraph from "../components/DepGraph/DepGraph";

export const DepGraphWrapper = props => (
    <DepGraph context={React.useContext(DepContext)} />
)
