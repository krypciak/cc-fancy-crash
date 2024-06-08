import type { Options } from 'ccmodmanager/types/mod-options'

export let Opts: ReturnType<typeof sc.modMenu.registerAndGetModOptions<ReturnType<typeof registerOpts>>>

export const GameRestartType = {
    LocationReload: 0,
    ChromeRuntimeReload: 1,
} as const

export const Themes = {
    Original: 0,
    Gray: 1,
} as const

export function registerOpts() {
    const opts = {
        general: {
            settings: {
                title: 'General',
                tabIcon: 'general',
            },
            headers: {
                general: {
                    gameRestartType: {
                        type: 'BUTTON_GROUP',
                        enum: GameRestartType,
                        init: GameRestartType.ChromeRuntimeReload,

                        buttonNames: ['location.reload()', 'chrome.runtime.reload()'],
                        name: `'Restart Game' button mode`,
                        description: `True for location.reload(), false for chrome.runtime.reload()`,
                    },
                    theme: {
                        type: 'BUTTON_GROUP',
                        enum: Themes,
                        init: Themes.Original,

                        buttonNames: ['Original', 'Gray'],
                        name: 'Theme',
                        description: 'Crash message theme',
                    },
                    explosion: {
                        type: 'CHECKBOX',
                        init: false,

                        name: 'Explosion',
                        description: 'Explosion',
                    },
                },
            },
        },
    } as const satisfies Options

    Opts = sc.modMenu.registerAndGetModOptions(
        {
            modId: 'cc-fancy-crash',
            title: 'cc-fancy-crash',
            // helpMenu: Lang.help.options,
        },
        opts
    )
    return opts
}
