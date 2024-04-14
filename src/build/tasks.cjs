const { d, toValues } = require("../shared/helper.cjs")

const TASK = {
    PREPARE_SOURCE: 0,
    PREPARE_SERVER: 1,
    SOURCE_TO_SERVER: 2,
    TRIGGER_INSTALL: 3,
    TRIGGER_START: 4
}

class Tasks {
    constructor(tasks = {}) {
        this.tasks = tasks
    }

    add(type, msg, prio = 10) {
        if (!this.tasks[type]) this.tasks[type] = []
        const tasks = this.tasks[type]

        let i = 0
        const newTask = { prio, msg }
        while (i < tasks.length && tasks[i].prio >= prio) {
            i++
        }
        if (i === tasks.length) {
            tasks.push(newTask)
        } else {
            tasks.splice(i, 0, newTask)
        }
        return this
    }

    getFlat() {
        const result = []
        const types = toValues(TASK)
        for (const type of types) {
            const tasks = this.tasks[type]
            if (!tasks) continue
            result.push( ...tasks.map(task => task.msg) )
        }
        return result
    }

    toJson() {
        return { ...this.tasks }
    }
}

module.exports = {
    Tasks,
    TASK
}