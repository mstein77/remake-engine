import React, {useState} from "react";
import {Section, Stack} from "./BaseComponents";

function SpriteSheetEditor(props) {
    return (
        <Stack dir="y" full>
            <div className="flex full-v">
                <Section name="Sprite sheet">
                    <div className="padded auto-scroll">
                        {JSON.stringify(props.spriteSheet)}
                    </div>
                </Section>
            </div>
        </Stack>
    );
}

export default SpriteSheetEditor;
