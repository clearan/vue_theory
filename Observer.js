class Watcher { // 存值： 一个是当前的value值，记录值的时候会触发getter劫持。一个是回调函数
    constructor(vm, expr, cb) {
        this.vm = vm
        this.expr = expr
        this.cb = cb
        // 先把旧值保存起来
        this.oldVal = this.getOldVal()
    }
    getOldVal() {
        Dep.target = this
        const oldVal = compileUtil.getVal(this.expr, this.vm)
        Dep.target = null
        return oldVal
    }
    update() {
        const newVal = compileUtil.getVal(this.expr, this.vm)
        if (newVal !== this.oldVal) {
            this.cb(newVal)
        }
    }
}

class Dep{
    constructor() {
        this.subs = []
    }
    // 收集观察者
    addSub(watcher) {
        this.subs.push(watcher)
    }
     // 通知观察者去更新
    notify() {
        console.log('观察者', this.subs)
        this.subs.forEach( w => w.update())
    }
}
class Observer {
    constructor(data) {
        this.observer(data)
    }
    observer(data) {
        if (data && typeof data === 'object') {
            Object.keys(data).forEach(key => {
                this.defineReactive(data, key, data[key])
            })
        }
    }
    defineReactive(data, key, value) {
        // 递归遍历
        this.observer(value)
        const dep = new Dep();
        // console.log(dep)
        Object.defineProperty(data, key, {
            enumerable: true,
            configurable: false,
            get() {
                // 订阅数据变化时，往Dep中添加观察者
                Dep.target && dep.addSub(Dep.target) // 这一步也很关键重要
                console.log(dep)
                // console.log(Dep.target)
                // console.log('触发读')
                return value;
            },
            set:(newVal)=> {
                this.observer(newVal)
                if (newVal !== value) {
                    value = newVal
                }
                console.log(dep)
                // 告诉Dep通知变化
                dep.notify()
            }
        })
    }
}