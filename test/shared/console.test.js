import {
    setAllowExit,
    errorSection,
    NoStackError,
    exec,
    execSync,
    spawnSync,
    extractOptionsAndArguments,
    getParsedArguments,
    newLine,
    mainSection,
    subSection,
    subSectionError,
    subSectionOk,
    subSectionWarning,
    setColorSupport,
    bold,
    dumpJson,
    getCliScript,
    setCliScript,
    setLogger,
    setBuildLogLevel,
    getBuildLogLevel,
    hasLogLevel,
    FG,
    log,
    EXIT_CODE_HANDLED
} from '../../src/shared/console.cjs'
import { d } from '../../src/shared/helper.cjs'
import path from "path"
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BASE_DIR = path.resolve(__dirname, '../../')

setAllowExit(false)
test('NoStackError', () => {
    {
        const e = NoStackError('foo')
        expect(e).toBeInstanceOf(Error)
        expect(e.noStack).toBeTrue()
        expect(e.output).toBeUndefined()
    }
    const e = NoStackError('foo', 'bar')
    expect(e.noStack).toBeTrue()
    expect(e.output).toEqual('bar')
})

test('bold', () => {
    setColorSupport(false)
    expect(bold('')).toEqual('')
    expect(bold('foo bar')).toEqual('foo bar')
    setColorSupport(true)
    expect(bold('')).toEqual('\x1b[1m\x1b[0m')
    expect(bold('foo bar')).toEqual('\x1b[1mfoo bar\x1b[0m')
})

test('dumpJson', () => {
    setColorSupport(false)
    const out = []
    setLogger({log: (...params) => out.push([ ...params ])})
    dumpJson('foo')
    expect(out.length).toBe(1)
    expect(out[0]).toEqual(["'foo'"])
    dumpJson('bar', 5)
    expect(out.length).toBe(2)
    expect(out[1]).toEqual(["     'bar'"])
})

test('setCliScript', () => {
    expect(process.env.RMK_SCRIPT).toBeUndefined()
    setCliScript('foo')
    expect(process.env.RMK_SCRIPT).toBe('foo')
    setCliScript('bar')
    expect(process.env.RMK_SCRIPT).toBe('foo')
    setCliScript('bar', true)
    expect(process.env.RMK_SCRIPT).toBe('bar')
})

test('getCliScript', () => {
    process.env.RMK_SCRIPT = ''
    expect(getCliScript()).toEqual('unknown')
    process.env.RMK_SCRIPT = 'foo'
    expect(getCliScript()).toEqual('foo')
})

test('get/setBuildLogLevel & hasLogLevel', () => {
    expect(() => setBuildLogLevel('foo')).toThrow('Invalid')
    setBuildLogLevel('none')
    expect(getBuildLogLevel()).toEqual('none')
    expect(hasLogLevel('minimal')).toBeFalse()
    expect(hasLogLevel('none')).toBeTrue()
    setBuildLogLevel('normal')
    expect(hasLogLevel('none')).toBeTrue()
    expect(hasLogLevel('minimal')).toBeTrue()
    setBuildLogLevel('verbose')
    expect(hasLogLevel('verbose')).toBeTrue()
})

test('log', () => {
    setColorSupport(false)
    {
        const out = []
        setLogger({log: (...params) => out.push([ ...params ])})
        log(444, 'xy', true)
        expect(out.length).toBe(1)
        expect(out[0]).toIncludeSameMembers([444, 'xy', true])
    }

    setColorSupport(true)
    {
        const out = []
        setLogger({log: (...params) => out.push([ ...params ])})
        log(444, 'xy', true)
        expect(out.length).toBe(1)
        expect(out[0]).toIncludeSameMembers([444, FG.RESET + 'xy' + FG.RESET, true])
    }
    setLogger(console)
})

test('newLine', () => {
    const out = []
    setLogger({log: (...params) => out.push([ ...params ])})
    newLine()
    expect(out.length).toBe(1)
    expect(out[0]).toIncludeSameMembers([])

})

test('mainSection', () => {
    const out = []
    setLogger({log: (...params) => out.push([ ...params ])})
    setBuildLogLevel('none')
    mainSection('foo')
    expect(out.length).toBe(0)
    setBuildLogLevel('minimal')
    mainSection('foo')
    expect(out.length).not.toBe(0)
})

test('subSection', () => {
    const out = []
    setLogger({log: (...params) => out.push([ ...params ])})
    setBuildLogLevel('none')
    subSection('foo')
    expect(out.length).toBe(0)
    setBuildLogLevel('minimal')
    subSection('foo')
    expect(out.length).toBe(0)
    setBuildLogLevel('normal')
    subSection('foo')
    expect(out.length).not.toBe(0)
})

test('subSectionOk', () => {
    const out = []
    setLogger({log: (...params) => out.push([ ...params ])})
    setBuildLogLevel('none')
    subSectionOk('foo')
    expect(out.length).toBe(0)
    setBuildLogLevel('minimal')
    subSectionOk('foo')
    expect(out.length).toBe(0)
    setBuildLogLevel('normal')
    subSectionOk('foo')
    expect(out.length).not.toBe(0)
})

test('subSectionWarning', () => {
    const out = []
    setLogger({log: (...params) => out.push([ ...params ])})
    setBuildLogLevel('none')
    subSectionWarning('foo')
    expect(out.length).toBe(0)
    setBuildLogLevel('minimal')
    subSectionWarning('foo')
    expect(out.length).toBe(0)
    setBuildLogLevel('normal')
    subSectionWarning('foo')
    expect(out.length).not.toBe(0)
})

test('subSectionError', () => {
    const out = []
    setLogger({log: (...params) => out.push([ ...params ])})
    setBuildLogLevel('none')
    subSectionError('foo')
    expect(out.length).not.toBe(0)
})

test('errorSection', () => {
    {
        const out = []
        const errors = []
        setLogger({
            log: (...params) => out.push([...params]),
            error: (...params) => errors.push([...params])
        })
        errorSection(new Error('foo'))
        expect(out.length).not.toBe(0)
        expect(errors.length).not.toBe(0)
    }
    {
        const out = []
        const errors = []
        process.env.RMK_ENGINE_VERSION = 'xy'
        setLogger({
            log: (...params) => out.push([...params]),
            error: (...params) => errors.push([...params])
        })
        errorSection(NoStackError('foo'))
        expect(out.length).not.toBe(0)
        expect(errors.length).toBe(0)
    }
    {
        const out = []
        const errors = []
        process.env.RMK_ENGINE_VERSION = 'xy'
        setLogger({
            log: (...params) => out.push([...params]),
            error: (...params) => errors.push([...params])
        })
        errorSection(NoStackError('foo', 'dump'))
        expect(out.length).not.toBe(0)
        expect(errors.length).toBe(0)
    }

})

test('exec', () => {
    {
        const out = []
        setLogger({log: (...params) => out.push([...params])})
        setBuildLogLevel('none')
        const cwd = path.resolve(BASE_DIR)
        exec('npm run start ++foo', { cwd }).then(({ output, exitCode, failed }) => {
            expect(failed).toBeTrue()
            expect(exitCode).toEqual(EXIT_CODE_HANDLED)
        })
    }
    {
        const out = []
        setLogger({log: (...params) => out.push([...params])})
        const cwd = path.resolve(BASE_DIR)
        exec('node -v', { cwd, stdio: 'ignore' }).then(({ output, exitCode, failed}) => {
            expect(failed).toBeFalse()
            expect(exitCode).toEqual(0)
            expect(output).toStartWith('v')
        })
    }
})
test('execSync', () => {
    {
        const out = []
        setLogger({log: (...params) => out.push([...params])})
        setBuildLogLevel('none')
        const cwd = path.resolve(BASE_DIR)
        const { output, exitCode, failed} = execSync('npm run start ++foo', { cwd })
        expect(failed).toBeTrue()
        expect(exitCode).toEqual(EXIT_CODE_HANDLED)
    }
    {
        const out = []
        setLogger({log: (...params) => out.push([...params])})
        const cwd = path.resolve(BASE_DIR)
        const { output, exitCode, failed} = execSync('node -v', { cwd, stdio: 'ignore' })
        expect(failed).toBeFalse()
        expect(exitCode).toEqual(0)
        expect(output).toStartWith('v')
    }
    {
        const out = []
        setLogger({log: (...params) => out.push([...params])})
        const cwd = path.resolve(BASE_DIR)
        const { output, exitCode, failed} = execSync('node -v', { cwd, print: true, stdio: 'ignore' })
        expect(failed).toBeFalse()
        expect(exitCode).toEqual(0)
        expect(output).toBeNull()
        expect(out.length).toEqual(1)
        expect(out[0][0]).toInclude('node -v')
    }
})

test('spawnSync', () => {
    {
        setBuildLogLevel('none')
        const cwd = path.resolve(BASE_DIR)
        const { status, output } = spawnSync('node', ['-v'],{ cwd, stdio: 'ignore'})
        expect(status).toEqual(0)
        expect(output.toString()).not.toBe("")
    }
})

test('extractOptionsAndArguments', () => {
    expect(() => extractOptionsAndArguments({}, 'npm run start', 'foo')).toThrow('game dir')
    {
        const out = []
        setLogger({log: (...params) => out.push([ ...params ])})
        setBuildLogLevel('none')
        const { options, args } = extractOptionsAndArguments({}, 'foo', 'foo')
        expect(options).toBeEmptyObject()
        expect(args).toBeEmpty()
    }

    process.env.RMK_SCRIPT_ARGS = '-h'
    {
        const out = []
        setLogger({log: (...params) => out.push([ ...params ])})
        setBuildLogLevel('none')
        extractOptionsAndArguments({options: {help: {}, foo: {hidden: true}}, flags: {h: 'help'}}, 'foo', 'bar')
        expect(out.length).not.toBe(0)
    }
    {
        const out = []
        setLogger({log: (...params) => out.push([ ...params ])})
        setBuildLogLevel('none')
        extractOptionsAndArguments({options: {help: {hidden: true}}, flags: {h: 'help'}}, 'foo', 'bar')
        expect(out.length).not.toBe(0)
    }
    {
        process.env.RMK_SCRIPT_ARGS = '-h'
        process.env.RMK_GAME_DIR = 'foo'
        const out = []
        setLogger({log: (...params) => out.push([ ...params ])})
        setBuildLogLevel('none')
        extractOptionsAndArguments({options: {help: {}, foo: {desc: 'bar'}, bar: {}}, flags: {h: 'help', f: 'foo'}}, 'npm run foo', ['bar', 'foo'])
        expect(out.length).not.toBe(0)
    }
    expect(() => extractOptionsAndArguments({flags: {f: 'foo', h: 'help'}, options: {help: {}}}, 'bar', 'foo')).toThrow('not exist')
})

test('getParsedArguments', () => {
    {
        const { options, args } = getParsedArguments({}, [])
        expect(options).toBeEmptyObject()
        expect(args).toBeEmpty()
    }
    expect(() => getParsedArguments({}, ['-f'])).toThrow('Unknown')
    expect(() => getParsedArguments({}, ['+f'])).toThrow('Unknown')
    expect(() => getParsedArguments({}, ['--foo'])).toThrow('Unknown')
    expect(() => getParsedArguments({}, ['++foo'])).toThrow('Unknown')
    expect(() => getParsedArguments({options: {foo: {}}}, ['--foo=x'])).toThrow('assigned')
    expect(() => getParsedArguments({options: {foo: {}}}, ['++foo=x'])).toThrow('assigned')
    expect(() => getParsedArguments({options: {foo: {}}, flags: {f: 'foo'}}, ['-f=x'])).toThrow('assigned')
    expect(() => getParsedArguments({options: {foo: {}}, flags: {f: 'foo'}}, ['+f=x'])).toThrow('assigned')
    expect(() => getParsedArguments({options: {foo: {argc: 1}}}, ['--foo'])).toThrow('expected')
    expect(() => getParsedArguments({options: {foo: {argc: 1}}}, ['++foo'])).toThrow('expected')
    expect(() => getParsedArguments({options: {foo: {argc: 2}}}, ['--foo=x'])).toThrow('expected')
    expect(() => getParsedArguments({options: {foo: {argc: 2}}}, ['++foo=x'])).toThrow('expected')
    expect(() => getParsedArguments({options: {foo: {argc: 2}, bar: {}}}, ['++foo=x --bar'])).toThrow('expected')
    expect(() => getParsedArguments({options: {foo: {}, bar: {argc: 1}}, flags: {f: 'foo', b: 'bar'}}, ['-fb='])).toThrow('assignment')
    expect(() => getParsedArguments({matchers: [() => false]}, ['xy'])).toThrow('Invalid')
    expect(() => getParsedArguments({matchers: [/^[0-9]+$/]}, ['xy'])).toThrow('Invalid')
    {
        const { options, args } = getParsedArguments(
            {options: {foo: {}, bar: {}}},
            ['--foo', '++bar']
        )
        expect(options.foo).toBeTrue()
        expect(options.bar).toBeTrue()
        expect(args).toBeEmpty()
    }
    {
        const { options, args } = getParsedArguments(
            {options: {foo: {}, bar: {}}, flags: {f: 'foo'}},
            ['-f', '--bar']
        )
        expect(options.foo).toBeTrue()
        expect(options.bar).toBeTrue()
        expect(args).toBeEmpty()
    }
    {
        const { options, args } = getParsedArguments(
            {options: {foo: {}, bar: {}}, flags: {f: 'foo', b: 'bar'}},
            ['-b', '', '+f']
        )
        expect(options.foo).toBeTrue()
        expect(options.bar).toBeTrue()
        expect(args).toBeEmpty()
    }
    {
        const { options, args } = getParsedArguments(
            {options: {foo: {}, bar: {}}, flags: {f: 'foo', b: 'bar'}},
            ['-bf']
        )
        expect(options.foo).toBeTrue()
        expect(options.bar).toBeTrue()
        expect(args).toBeEmpty()
    }
    {
        const { options, args } = getParsedArguments(
            {options: {foo: {argc: 1}, bar: {}}, flags: {f: 'foo', b: 'bar'}},
            ['-f=test']
        )
        expect(options.foo).toEqual('test')
        expect(args).toBeEmpty()
    }
    {
        const { options, args } = getParsedArguments(
            {options: {foo: {argc: 1}, bar: {}}, flags: {f: 'foo', b: 'bar'}},
            ['-f', 'test']
        )
        expect(options.foo).toEqual('test')
        expect(args).toBeEmpty()
    }
    {
        const { options, args } = getParsedArguments(
            {options: {foo: {argc: 2}, bar: {}}, flags: {f: 'foo', b: 'bar'}},
            ['-f=test', 'test2']
        )
        expect(options.foo).toEqual(['test', 'test2'])
        expect(args).toBeEmpty()
    }
    {
        const { options, args } = getParsedArguments(
            {options: {foo: {argc: 1}, bar: {}}, flags: {f: 'foo', b: 'bar'}},
            ['--foo', 'test']
        )
        expect(options.foo).toEqual('test')
        expect(args).toBeEmpty()
    }
    {
        const { options, args } = getParsedArguments(
            {options: {foo: {argc: 2}, bar: {argc: 2}}, flags: {f: 'foo', b: 'bar'}},
            ['++foo=test',  'test2', '--bar=test3', 'test4']
        )
        expect(options.foo).toEqual(['test',  'test2'])
        expect(options.bar).toEqual(['test3',  'test4'])
        expect(args).toBeEmpty()
    }
    {
        const { options, args } = getParsedArguments(
            {options: {foo: {argc: 2}, bar: {argc: 2}}, flags: {f: 'foo', b: 'bar'}},
            ['+f=test',  'test2', '--bar=test3', 'test4']
        )
        expect(options.foo).toEqual(['test',  'test2'])
        expect(options.bar).toEqual(['test3',  'test4'])
        expect(args).toBeEmpty()
    }
    {
        const { options, args } = getParsedArguments(
            {options: {foo: {argc: 2}, bar: {argc: 2}}, flags: {f: 'foo', b: 'bar'}},
            ['+f', 'test',  'test2', '--bar=test3', 'test4']
        )
        expect(options.foo).toEqual(['test',  'test2'])
        expect(options.bar).toEqual(['test3',  'test4'])
        expect(args).toBeEmpty()
    }
    {
        const { options, args } = getParsedArguments(
            {options: {foo: {argc: 2}, bar: {argc: 2}}, flags: {f: 'foo', b: 'bar'}},
            ['foo', 'bar']
        )
        expect(args).toEqual(['foo', 'bar'])
    }
    {
        const { options, args } = getParsedArguments(
            {options: {
                    foo: {argc: 2}, bar: {argc: 2}
                }, flags: {
                    f: 'foo', b: 'bar'
                }, matcher: [
                    /^[a-z]+$/,
                    item => true
                ]
                },
            ['foo', 'bar']
        )
        expect(args).toEqual(['foo', 'bar'])
    }
})