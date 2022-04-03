const defaultValues = {
    config: {
        maxWidthPx: 1600,
        noMaxWidth: false,
        maxHeightPx: 1200,
        noMaxHeight: true,
        tooltips: true,
        uiAnimations: true,
        maxHistory: 10,
        tabSpaces: 2
    },
    theme: {
        defaultPaddingPx: 9,
        boxBorderWidthPx: 1,
        maxWidthPx: 1200,
        maxHeightPx: 1200,
        boxBorderRgb: "#2b7797",
        lessPerc: 50,
        morePerc: 150,
        disabledPerc: 45,

        inputBgRgb: "#b0aec1",
        inputRgb: "#29292e",
        inputBorderRgb: "#a8a8a8",
        inputBstyle: "solid",
        inputBorderWidthPx: 1,
        inputPaddingPx: 5,
        inputMinPaddingPx: 1,
        inputBorderRadiusPx: 4,

        fontSizeSmallPx: 11,
        fontSizeMediumPx: 12,
        fontSizeBigPx: 14,

        monoFont: '"Lucida Console", Courier, monospace',

        checkBoxType: 0,
        hoverChangeType: -1,
        hoverIntensityFloat: 0.25,

        editorBgRgb: "#080808",
        editorRgb: "#9aa0a2",

        primaryBgRgb: "#080808",
        primaryRgb: "#9aa0a2",
        secondaryBgRgb: "#2f304b",
        secondaryRgb: "#9aa0a2",
        ghostBgRgb: "#181818",

        // header
        headerType: 0,  // window | floating
        headerBgType: 0, // primary | color | gradient
        headerBgRgb: "#86a096",
        headerBgGrad: 'linear-gradient(90deg, #030024ff 0%, #080842ff 51%, #05d2feff 100%)',

        // title
        titleBgType: 0, // primary | color | gradient
        titleBgRgb: "#662341",
        titleBgGrad: 'linear-gradient(90deg, #030024ff 0%, #080842ff 51%, #05d2feff 100%)',
        titleVertBgGrad: 'linear-gradient(180deg, #030024ff 0%, #080842ff 51%, #05d2feff 100%)',

        overlayBgRgba: "#000000a3",

        focusBgRgba: '#FFFFDFCC',
        focusWidthPx: 1,

        buttonBgRgb: "#1e42ae",
        buttonRgb: "#b0d5e8",
        buttonBorderRgb: "#347f66",
        buttonBstyle: "solid",
        buttonBorderWidthPx: 1,
        buttonMinPaddingPx: 3,
        buttonPaddingPx: 5,
        buttonBorderRadiusPx: 4,

        activeRgb: '#fafbff',
        activeBgRgb: '#5baa2b',
        activeBorderRgb: '#D0D0F0',
        warningBgRgb: '#987672',
        warningRgb: '#000000',
        warningBorderRgb: '#000000',
        errorBgRgb: '#AA0020',
        errorRgb: '#E0E0A0',
        cursorBgRgba: '#58585888',

        markerWidthMinPx: 1,
        markerWidthMaxPx: 8,
        markerOpacityMinPerc: 20,
        markerOpacityMaxPerc: 70,
        markerInvertMaxPerc: 50,

        linkResourcesUrls: "https://fonts.googleapis.com/icon?family=Material+Icons https://fonts.googleapis.com/css?family=Roboto:400,400i,700,700i",
        buttonFont: "Monospace",
        fontUrl: "https://fonts.googleapis.com/css?family=Roboto:400,400i,700,700i"
    },
    mapping: {
        undo: 'm z',
        redo: 'm y',
        save: 'm s',
        export: 'm x',
        new: 'c n',
        select: null,
        delete: 'c d',
        toggle: 'c t',
        quit: 'c q',
        edit: 'm e',
        all: 'c a',
        pick: 'c p',
        play: 'm p',
        submit: 'Enter',
        close: 'Escape'
    }
};

export {
    defaultValues
}