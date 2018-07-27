import {
    pluginFactory
} from './pluginFactory';
import {
    dispatchPlugin,
    effectsPlugin
} from './plugins';
import {
    createRedux
} from './createRedux';
import {
    validate
} from './utils';
let corePlugins = [dispatchPlugin, effectsPlugin];
/**
 * Rematch class
 *
 * an instance of Rematch generated by "init"
 */

export function Rematch(config) {
    let _this = this;
    this.plugins = [];
    this.pluginFactory = pluginFactory(config);
    this.config = config;
    for (
        let _i = 0, _a = corePlugins.concat(this.config.plugins); _i < _a.length; _i++
    ) {
        let plugin = _a[_i];
        this.plugins.push(this.pluginFactory.create(plugin));
    }
    // preStore: middleware, model hooks
    this.forEachPlugin('middleware', function(middleware) {
        _this.config.redux.middlewares.push(middleware);
    });
}
Rematch.prototype = {
    constructor: Rematch,
    forEachPlugin(method, fn) {
        this.plugins.forEach(function(plugin) {
            if (plugin[method]) {
                fn(plugin[method]);
            }
        });
    },
    getModels(models) {
        return Object.keys(models).map(function(name) {
            return Object.assign({
                name: name
            }, models[name]);
        });
    },
    addModel(model) {
        validate([
            [!model, 'model config is required'],
            [model.name !== model.name + "", 'model "name" [string] is required'],
            [model.state === void 666, 'model "state" is required']
        ]);
        // run plugin model subscriptions
        this.forEachPlugin('onModel', function(onModel) {
            return onModel(model);
        });
    },
    init() {
        let _this = this;
        // collect all models
        this.models = this.getModels(this.config.models);
        this.models.forEach(function(model) {
            _this.addModel(model);
        });
        // create a redux store with initialState
        // merge in additional extra reducers
        let redux = createRedux.call(this, {
            redux: this.config.redux,
            models: this.models
        });
        let rematchStore = Object.assign({}, redux.store, {
            // dynamic loading of models with `replaceReducer`
            model: function(model) {
                _this.addModel(model);
                redux.mergeReducers(redux.createModelReducer(model));
                redux.store.replaceReducer(
                    redux.createRootReducer(_this.config.redux.rootReducers)
                );
            }
        });
        this.forEachPlugin('onStoreCreated', function(onStoreCreated) {
            return onStoreCreated(rematchStore);
        });
        rematchStore.dispatch = this.pluginFactory.dispatch;
        return rematchStore;
    }
};