import {extend, isFn, inherit, typeNumber} from "./util";
import {Component} from "./Component";
/**
 * 为了兼容0.13之前的版本
 */
const AUTOBIND_BLACKLIST = {
    render: 1,
    shouldComponentUpdate: 1,
    componentWillReceiveProps: 1,
    componentWillUpdate: 1,
    componentDidUpdate: 1,
    componentWillMount: 1,
    componentDidMount: 1,
    componentWillUnmount: 1,
    componentDidUnmount: 1
};

function collectMixins(mixins) {
    let keyed = {};

    for (let i = 0; i < mixins.length; i++) {
        let mixin = mixins[i];
        if (mixin.mixins) {
            applyMixins(mixin, collectMixins(mixin.mixins));
        }

        for (let key in mixin) {
            if (mixin.hasOwnProperty(key) && key !== 'mixins') {
                (keyed[key] || (keyed[key] = [])).push(mixin[key]);
            }
        }
    }

    return keyed;
}
var MANY_MERGED = {
    getInitialState: 1,
    getDefaultProps: 1,
    getChildContext: 1
}
function flattenHooks(key, hooks) {
    let hookType = typeof hooks[0];
    if (hookType === 'object') {
        // Merge objects
        hooks.unshift({});
        return Object
            .assign
            .apply(null, hooks);
    } else if (hookType === 'function') {
        return function () {
            let ret;
            for (let i = 0; i < hooks.length; i++) {
                let r = hooks[i].apply(this, arguments);
                if (r && MANY_MERGED[key]) {
                    if (!ret) 
                        ret = {};
                    Object.assign(ret, r);
                }
            }
            return ret;
        };
    } else {
        return hooks[0];
    }
}

function applyMixins(proto, mixins) {
    for (let key in mixins) {
        if (mixins.hasOwnProperty(key)) {
            proto[key] = flattenHooks(key, mixins[key].concat(proto[key] || []));
        }
    }
}

//创建一个构造器
function newCtor(className) {
    var curry = Function("ReactComponent", "list", 
    `return function ${className}(props, context) {
      ReactComponent.call(this, props, context);

     for (let methodName in this) {
        let method = this[methodName];
        if (typeof method  === 'function'&& !list[methodName]) {
          this[methodName] = method.bind(this);
        }
      }

      if (spec.getInitialState) {
        this.state = spec.getInitialState.call(this);
      }

  };`);
    return curry(Component, AUTOBIND_BLACKLIST);
}

var warnOnce = 1;
export function createClass(spec) {
    if (warnOnce) {
        warnOnce = 0;
        console.warn("createClass已经过时，强烈建议使用es6方式定义类"); // eslint-disable-line
    }
    var Constructor = newCtor(spec.displayName || "Component");
    var proto = inherit(Constructor, Component);
    //如果mixins里面非常复杂，可能mixin还包含其他mixin
    if (spec.mixins) {
        applyMixins(spec, collectMixins(spec.mixins));
    }

    extend(proto, spec);

    if (spec.statics) {
       extend(Constructor, spec.statics);
    }
    "propTypes,contextTypes,childContextTypes,displayName"
        .replace(/\w+/g, function (name) {
            if (spec[name]) {
                Constructor[name] = spec[name];
            }
        })

    if (isFn(spec.getDefaultProps)) {
        Constructor.defaultProps = spec.getDefaultProps();
    }

    return Constructor;
}
