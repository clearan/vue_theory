const compileUtil = {
    getVal(expr, vm) {
        return expr.split('.').reduce((data, currentVal) => {
            return data[currentVal]
        }, vm.$data)
    },
    setVal(expr, vm, inputVal) {
        return expr.split('.').reduce((data, currentVal) => {
            data[currentVal] = inputVal
        }, vm.$data)
    },
    getContentVal(expr, vm) {
        return expr.replace(/\{\{(.+?)\}\}/g,(...args) => { // 处理{{}} 这样的
            return this.getVal(args[1], vm)
        })
    },
    text(node, expr, vm) { // expr: msg
        let value;
        console.log(expr)
        if (expr.indexOf('{{') !== -1) {
            value = expr.replace(/\{\{(.+?)\}\}/g,(...args) => { // 处理{{}} 这样的
                console.log('匹配上的值', args[1])
                // 绑定观察者，将来数据发生变化 触发这里的回调 进行更新
                new Watcher(vm, args[1], (newVal)=> { // 这里太重要了。compile编译模板的时候，就会new一个watcher,将渲染函数作为回调函数以参数的形式
                    this.updater.textUpdater(node, this.getContentVal(expr, vm)) // 首次渲染，展现在页面上
                })
                return this.getVal(args[1], vm)
            })
        } else {
            value = this.getVal(expr, vm)
        }
        this.updater.textUpdater(node, value) // 首次渲染，展现在页面上
    },
    html(node, expr, vm) {
        const value = this.getVal(expr, vm)
        const w1 = new Watcher(vm, expr, (newVal)=> { // 这里太重要了。compile编译模板的时候，就会new一个watcher,将渲染函数作为回调12函数以参数的形式
            this.updater.htmlUpdater(node, newVal) // 首次渲染，展现在页面上
        })
        // console.log(w1)
        this.updater.htmlUpdater(node, value) // 首次渲染，展现在页面上
    },
    model(node, expr, vm) {
        const value = this.getVal(expr, vm)
        console.log('创建watcher', value)
        new Watcher(vm, expr, (newVal)=> { // 这里太重要了。compile编译模板的时候，就会new一个watcher,将渲染函数作为回调函数以参数的形式
            this.updater.modelUpdater(node, newVal) // 首次渲染，展现在页面上
        })
        node.addEventListener('input', (e) => {
            this.setVal(expr, vm, e.target.value) // 双向数据绑定
        })
        this.updater.modelUpdater(node, value) // 首次渲染，展现在页面上
    },
    on(node, expr, vm, eventName) {
        let fn = vm.$options.methods && vm.$options.methods[expr];
        node.addEventListener(eventName, fn.bind(vm), false)
    },
    // 更新的函数
    updater: {
        textUpdater(node, value) {
            node.textContent = value; // 注意textContent和innerText的区别。总之，这里是将dom的value值插入，显示在页面上
        },
        htmlUpdater(node ,value) {
            node.innerHTML = value
        },
        modelUpdater(node ,value) {
            node.value = value
        },
    }
}
class Compile {
    constructor(el, vm) {
        console.log('开始Compile模板编译')
        this.el = this.isElementNode(el) ? el : document.querySelector(el);
        this.vm = vm;
        // 1、获取文档碎片对象，放入内存中减少页面回流和重绘
        const fragment = this.nodeFragment(this.el);
        // 2、编译模板
        this.compile(fragment);

        // 3、追加子元素到根元素
        this.el.appendChild(fragment)
    }

    compile(fragment) {
        const childNodes = fragment.childNodes;
        [...childNodes].forEach(child => {
            if (this.isElementNode(child)) {
                // 是元素节点
                // 编译元素节点
                // console.log('元素节点', child)
                this.compileElement(child)
            } else {
                // 是文本节点
                // 编译文本节点
                // console.log('文本节点', child)
                this.compileText(child)
            }
            if (child.childNodes && child.childNodes.length) { // 递归
                this.compile(child)
            }
        })
    }

    compileElement(node) {
        // console.log(node)
        const attributes = node.attributes;
        [...attributes].forEach(attr => {
            const {name, value} = attr;
            if (this.isDirective(name)) { // 是一个指令 v-text v-html v-model
                const [, directive] = name.split('-'); // text html model on:click
                const [dirName, eventName] = directive.split(':'); // text html model on
                // 更新数据 数据驱动视图
                compileUtil[dirName](node, value ,this.vm, eventName);

                // 删除有指令的标签上的属性
                node.removeAttribute('v-'+directive)
            } else if (this.isEventName(name)) { // @click = 'handleClick
                let [,eventName] = name.split('@')
                compileUtil['on'](node, value ,this.vm, eventName);
            }
        })
    }

    isEventName(attrName) {
        return attrName.startsWith('@');
    }

    isDirective(attrName) {
        return attrName.startsWith('v-');
    }
    compileText(node) {
        const content = node.textContent;
        if (/\{\{(.+?)\}\}/.test(content)) {
            // console.log(content)
            compileUtil['text'](node, content, this.vm)
        }
    }
    nodeFragment(el) {
        // 创建文档碎片
        const f = document.createDocumentFragment();
        while(el.firstChild) {
            f.appendChild(el.firstChild);
        }
        return f;
    }

    isElementNode(node) {
        return node.nodeType === 1; // 元素节点对象则返回true，直接使用。否则是“#app”的字符串，需要读取
    }

}
class MVue {
    constructor(options) {
        this.$el = options.el;
        this.$data = options.data;
        this.$options = options;
        if (this.$el) {
            // 1、实现一个数据观察者
            new Observer(this.$data)

            new Compile(this.$el, this)
            this.proxyData(this.$data)
        }
    }
    proxyData(data) {
        for (const key in data) {
            Object.defineProperty(this, key, {
                get() {
                    return data[key]
                },
                set(newVal) {
                    data[key] = newVal
                }
            })
        }
    }
}
