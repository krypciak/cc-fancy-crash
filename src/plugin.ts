import { Mod } from "ultimate-crosscode-typedefs/modloader/mod"

type GameCrashInfo = Parameters<typeof GAME_ERROR_CALLBACK>[1]
type InGameCrashInfo = Parameters<typeof GAME_ERROR_CALLBACK>[2]

declare global {
    namespace ig {
        interface System {
            crashed: boolean
            run(): void
        }
        interface SoundManager {
            getSampleRate(this: this): number
        }
        interface Game {
            getVersion(this: this): string
        }
        var OS: string
        var browser: string
        var browserVersion: string
        var nwjsVersion: string
        var nwjs64: boolean
        var webAudioActive: boolean

        var dom: {
            create(a: string, b?: { [key: string]: string }, c?: (HTMLElement | JQuery | string | number)[] | JQuery): JQuery
            html(a: string): JQuery
            append(a: any[], b: any[]): void
            prepend(a: any[], b: any[]): void
            before(a: any[], b: any[]): void
            bind(a: any[], b: any, c: any): unknown | void
        }
        function getPlatformName(platformId: number): string
    }
    var crashMsg: {
        dom: JQuery
        copyFuncs: (() => void)[]
        promiseResolve?: (res: { doCrash: boolean, index?: number }) => void
    }[]

    var activeMods: ModCCL2[]
}

type ModCCL2 = Mod & {
    isCCL3: false
    name: string
}

export type Mod1 = Mod & {
    isCCModPacked: boolean
    findAllAssets?(): void /* only there for ccl2, used to set isCCL3 */
} & ({
    isCCL3: true
    id: string
} | ModCCL2)

interface CrashMsgTheme {
    bg?: string
    fg?: string
    bgTextField?: string
    fgTextField?: string
}

const themes: Record<string, CrashMsgTheme> = {
    Original: { },
    Gray: { bg: '#1d1f21', fg: '#fcfcfc', bgTextField: '#303336', fgTextField: '#fcfcfc', }
}
const discordBadge: string = `https://img.shields.io/discord/382339402338402315?logo=discord&logoColor=white&label=CrossCode%20Modding`
const discordLink: string = `https://discord.com/invite/3Xw69VjXfW`

const optionsHeader: string = 'crashmsg'
const checkboxReload: string = `${optionsHeader}-reload`
const checkboxTheme: string = `${optionsHeader}-theme`
const checkboxExplosion: string = `${optionsHeader}-explosion`
let isCCL3: boolean

export default class FancyCrashMessage {
    mod: Mod1

    constructor(mod: Mod1) {
        this.mod = mod
        isCCL3 = !!mod.findAllAssets
    }

    async poststart() {
		ig.lang.labels.sc.gui.options.headers[optionsHeader] = 'Crash Message'
        ig.lang.labels.sc.gui.options[checkboxReload] = {
            name: `'Restart Game' button mode`,
            description: 'True for location.reload(), false for chrome.runtime.reload()'
        }
        ig.lang.labels.sc.gui.options[checkboxTheme] = {
            name: 'Theme',
            description: 'Crash message theme',
            group: Object.keys(themes).map(str => str),
        }
        ig.lang.labels.sc.gui.options[checkboxExplosion] = {
            name: 'Explosion',
            description: 'Explosion',
        }
    }

    async prestart() {
        sc.OPTIONS_DEFINITION[checkboxTheme] = {
            type: 'BUTTON_GROUP',
            init: Object.keys(themes).indexOf('Original'),
            data: Object.entries(themes).reduce((acc, [k, _], i) => {
                acc[k] = i
                return acc
            }, {} as { [key: string]: number }),
            cat: sc.OPTION_CATEGORY.INTERFACE,
            header: optionsHeader,
            hasDivider: true,
        }
        sc.OPTIONS_DEFINITION[checkboxExplosion] = {
            type: 'CHECKBOX',
            init: true,
            cat: sc.OPTION_CATEGORY.INTERFACE,
            header: optionsHeader,
        }
        sc.OPTIONS_DEFINITION[checkboxReload] = {
            type: 'CHECKBOX',
            init: false,
            cat: sc.OPTION_CATEGORY.INTERFACE,
            header: optionsHeader,
        }

        ig.System.inject({
            // @ts-expect-error the typedefs say that this returns never but modify it so it can return void
            error(error: Error) {
                this.crashed = true
                const gci: Partial<GameCrashInfo> = {}
                if (ig.game) {
                    gci.map = ig.game.mapName || 'NO MAP'
                    gci.version = ig.game.getVersion()
                } else {
                    gci.map = 'GAME INIT'
                    gci.version = '---'
                }
                gci.platform = ig.getPlatformName(ig.platform)
                gci.OS = ig.OS
                gci.browser = ig.browser
                gci.browserVersion = ig.browserVersion
                gci.nwjsVersion = ig.nwjsVersion && ig.nwjsVersion[0]
                gci["64bit"] = ig.nwjs64
                gci.webAudio = ig.webAudioActive
                gci.sampleRate = ig.soundManager.getSampleRate()
                const gameInfo: Partial<InGameCrashInfo> = {}
                ig.game && ig.game.getErrorData(gameInfo)
            
                if (GAME_ERROR_CALLBACK) {
                    (GAME_ERROR_CALLBACK as ((error: Error, info: GameCrashInfo, gameInfo: InGameCrashInfo) => Promise<{ doCrash: boolean, index?: number }>))
                        (error, gci as GameCrashInfo, gameInfo as InGameCrashInfo).then(res => {
                            if (res.doCrash) {
                                window.crashMsg[res.index!].dom.hide()
                                console.log('running')
                                this.crashed = false
                                ig.system.run()
                            } else {
                                throw error
                            }
                        })
                } else {
                    throw error
                }
            },
        })
        
        window.GAME_ERROR_CALLBACK = async function(err: Error, info: GameCrashInfo, gameInfo: InGameCrashInfo): Promise<{ doCrash: boolean, index?: number }> {
            const infoText: string = `ccV: ${info.version},   cclV: ${isCCL3 ? '3' : '2'},  OS: ${info.OS},   platform: ${info.platform},   ` + 
                                     `nwjsV: ${info.nwjsVersion},   browserV: ${info.browserVersion} ${info.map ? `,   map: ${info.map}` : ''}` +
                                     `\n\n${err.stack}`

            /* [modName, modVersion] */
            const mods: [string, string | undefined][] = isCCL3 ?
                Array.from(window.modloader.loadedMods.values()).map(m => [m.id, m.version?.toString()])
                : window.activeMods.map(m => [m.name, m.version?.toString()])
            const modListTxt: string = mods.map(m => `${m[0]}  ${m[1] ?? 'versionNull'}`).reduce((v, acc) => acc + '\n' + v)

            let themeOptionIndex: number | undefined = sc.options?.get(checkboxTheme) as number | undefined
            const theme: CrashMsgTheme = themeOptionIndex === undefined ? themes['Original'] : Object.values(themes)[themeOptionIndex]
            const doExplosion: boolean = sc.options?.get(checkboxExplosion) as boolean ?? false
            const reloadCmd: string = sc.options?.get(checkboxReload) ? 'window.location.reload()' : 'chrome.runtime.reload()'

            const divStyle: string = `${theme.bg ? `background-color: ${theme.bg};` : ''} ${theme.fg ? `foreground-color: ${theme.fg};` : ''}
                top: 40%; height: 600px; margin-top: -200px; transition: all 1s;`
            const textAreaStyle: string = `${theme.bgTextField ? `background-color: ${theme.bgTextField};` : ''} ${theme.fgTextField ? `foreground-color: ${theme.fgTextField};` : ''}`

            const expDom = ig.dom.html(`
                <div style="width: 70%; left: 10%; max-width: 100%; position: absolute; top: -35%; ">
                    <img src="mods/cc-fancy-crash/assets/media/pics/deltarune-explosion.gif" style="width: 100%; height: auto;">
                </div>
            `)
            const mainDom = ig.dom.html(`
                <div class="errorMessage" style="${divStyle}">
                <h3>CRITICAL BUG!</h3>
                ${doExplosion ? `<audio id="sound" src="mods/cc-fancy-crash/assets/media/sound/deltarune-explosion.ogg" autoplay></audio>` : ''}
                <p class="top">
                    It's very likely caused by a mod.<br>
                    Please report it here ↓↓↓ before before messaging the CrossCode Developers<br>
                    <img src="${discordBadge}" onclick="window.nw.Shell.openExternal('${discordLink}')">
                </p>
                <textarea id="textarea1" readonly style="${textAreaStyle}">${infoText}</textarea>
                <textarea id="textareaMods" readonly style="${textAreaStyle}">${modListTxt}</textarea>
                <p class="bottom"></p>
            </div>`)

            mainDom.find('#textarea1')   .click(function(this: any) { $(this).select() } )
            mainDom.find('#textareaMods').click(function(this: any) { $(this).select() } )

            window.crashMsg ??= []
            const crashMsgIndex: number = window.crashMsg.push({
                    dom: mainDom,
                    copyFuncs: [ infoText, modListTxt, gameInfo.save ].map(str => (() => { nw.Clipboard.get().set(str) })),
                }) - 1

            mainDom.append(ig.dom.html(`<a href="javascript:${reloadCmd}"                                     class="bigButton" >Restart the Game</a>`))
            mainDom.append(ig.dom.html(`<a href="javascript:window.crashMsg[${crashMsgIndex}].copyFuncs[0]()" class="bigButton" >Copy crash log</a>`))
            mainDom.append(ig.dom.html(`<a href="javascript:window.crashMsg[${crashMsgIndex}].copyFuncs[1]()" class="bigButton" >Copy mod list</a>`))
            mainDom.append(ig.dom.html(`<a href="javascript:window.crashMsg[${crashMsgIndex}].copyFuncs[2]()" class="bigButton" >Copy save data</a>`))
            mainDom.append(ig.dom.html(`<a href="javascript:window.crashMsg[${crashMsgIndex}].promiseResolve({doCrash: true, index: ${crashMsgIndex}})"   class="bigButton" >Ignore the error</a>`))

            $(document.body).append(mainDom)
            doExplosion && $(document.body).append(expDom)
            window.setTimeout(() => { mainDom.addClass('shown') }, 20)
            const promise = new Promise<{ doCrash: boolean, index?: number }>((res) => {
                window.crashMsg[crashMsgIndex].promiseResolve = res
            })
            doExplosion && setTimeout(function () { expDom.hide() }, 1400);
            return promise
        }
    }
}
