import React, {useState} from "react";
import {Section} from "./BaseComponents";

function FontMapEditor(props) {
    return (
        <Section name="Font Map">
            <div className="padded">
                {JSON.stringify(props.fontMap.map)}
            </div>
        </Section>
    );
}

export default FontMapEditor;
