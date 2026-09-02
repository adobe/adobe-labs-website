// node_modules/highgain/dist/index.js
var l = Symbol("transfer");
function M(e, r) {
  return {
    type: l,
    value: e,
    transfer: r ? Array.isArray(r) ? r : [r] : [e]
  };
}
function p(e) {
  return !!(e && typeof e == "object" && Reflect.get(e, "type") === l);
}
function h(e = "default") {
  return {
    createTx(r) {
      const f = /* @__PURE__ */ new Map(), n = r ?? self;
      return n.addEventListener("message", (u) => {
        const { data: o } = u;
        if (o.channelName !== e)
          return;
        const { id: a, result: s, error: t } = o, c = f.get(a);
        c && (t ? c.reject(t) : c.resolve(s), f.delete(a));
      }), new Proxy(
        {},
        {
          get(u, o) {
            return (...a) => {
              const s = g(), t = [], c = [];
              return a.forEach((i) => {
                p(i) ? (t.push(i.value), c.push(...i.transfer)) : t.push(i);
              }), n.postMessage(
                { method: o, args: t, id: s, channelName: e },
                { transfer: c }
              ), new Promise((i, y2) => {
                f.set(s, { resolve: i, reject: y2 });
              });
            };
          }
        }
      );
    },
    rx(r, f) {
      const n = f ?? self;
      n.addEventListener("message", async (d) => {
        const { data: u } = d;
        if (u.channelName !== e)
          return;
        const { method: o, args: a, id: s } = u;
        try {
          const t = await r[o](...a);
          p(t) ? n.postMessage(
            { result: t.value, id: s, channelName: e },
            { transfer: t.transfer }
          ) : n.postMessage({ result: t, id: s, channelName: e });
        } catch (t) {
          n.postMessage({ error: t, id: s, channelName: e });
        }
      });
    }
  };
}
function g() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}

// node_modules/ts-deepmerge/esm/index.js
var isObject = (obj) => {
  if (typeof obj === "object" && obj !== null) {
    if (typeof Object.getPrototypeOf === "function") {
      const prototype = Object.getPrototypeOf(obj);
      return prototype === Object.prototype || prototype === null;
    }
    return Object.prototype.toString.call(obj) === "[object Object]";
  }
  return false;
};
var UNSAFE_KEYS = /* @__PURE__ */ new Set([
  "__proto__",
  "constructor",
  "prototype",
  "toString",
  "valueOf",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "toLocaleString"
]);
var merge = (...objects) => objects.reduce((result, current) => {
  if (current === void 0) {
    return result;
  }
  if (Array.isArray(current)) {
    throw new TypeError("Arguments provided to ts-deepmerge must be objects, not arrays.");
  }
  Object.keys(current).forEach((key) => {
    if (UNSAFE_KEYS.has(key)) {
      return;
    }
    if (Array.isArray(result[key]) && Array.isArray(current[key])) {
      result[key] = merge.options.mergeArrays ? merge.options.uniqueArrayItems ? Array.from(new Set(result[key].concat(current[key]))) : [...result[key], ...current[key]] : current[key];
    } else if (isObject(result[key]) && isObject(current[key])) {
      result[key] = merge(result[key], current[key]);
    } else if (!isObject(result[key]) && isObject(current[key])) {
      result[key] = merge(current[key], void 0);
    } else {
      result[key] = current[key] === void 0 ? merge.options.allowUndefinedOverrides ? current[key] : result[key] : current[key];
    }
  });
  return result;
}, {});
var defaultOptions = {
  allowUndefinedOverrides: true,
  mergeArrays: true,
  uniqueArrayItems: true
};
merge.options = defaultOptions;
merge.withOptions = (options, ...objects) => {
  merge.options = Object.assign(Object.assign({}, defaultOptions), options);
  const result = merge(...objects);
  merge.options = defaultOptions;
  return result;
};

// node_modules/@contentauth/c2pa-web/dist/c2pa-Di8FrHc6.js
var { createTx: W, rx: se } = h();
var { createTx: ce, rx: P } = h("worker");
var J = '(function(){"use strict";class p{static __wrap(e){const t=Object.create(p.prototype);return t.__wbg_ptr=e,k.register(t,t.__wbg_ptr,t),t}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,k.unregister(this),e}free(){const e=this.__destroy_into_raw();o.__wbg_wasmbuilder_free(e,0)}addAction(e){const t=o.wasmbuilder_addAction(this.__wbg_ptr,e);if(t[1])throw b(t[0])}addAssertion(e,t){const n=f(e,o.__wbindgen_malloc,o.__wbindgen_realloc),_=a,c=o.wasmbuilder_addAssertion(this.__wbg_ptr,n,_,t);if(c[1])throw b(c[0])}addIngredient(e){const t=f(e,o.__wbindgen_malloc,o.__wbindgen_realloc),n=a,_=o.wasmbuilder_addIngredient(this.__wbg_ptr,t,n);if(_[1])throw b(_[0])}addIngredientFromBlob(e,t,n){const _=f(e,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a,i=f(t,o.__wbindgen_malloc,o.__wbindgen_realloc),s=a;return o.wasmbuilder_addIngredientFromBlob(this.__wbg_ptr,_,c,i,s,n)}addRedaction(e,t){const n=f(e,o.__wbindgen_malloc,o.__wbindgen_realloc),_=a,c=o.wasmbuilder_addRedaction(this.__wbg_ptr,n,_,t);if(c[1])throw b(c[0])}addResourceFromBlob(e,t){const n=f(e,o.__wbindgen_malloc,o.__wbindgen_realloc),_=a,c=o.wasmbuilder_addResourceFromBlob(this.__wbg_ptr,n,_,t);if(c[1])throw b(c[0])}filterActionsAndIngredientsAt(e,t){const n=E(e,o.__wbindgen_malloc),_=a,c=E(t,o.__wbindgen_malloc),i=a,s=o.wasmbuilder_filterActionsAndIngredientsAt(this.__wbg_ptr,n,_,c,i);if(s[1])throw b(s[0])}filterActionsAt(e){const t=E(e,o.__wbindgen_malloc),n=a,_=o.wasmbuilder_filterActionsAt(this.__wbg_ptr,t,n);if(_[1])throw b(_[0])}filterIngredientsAt(e){const t=E(e,o.__wbindgen_malloc),n=a,_=o.wasmbuilder_filterIngredientsAt(this.__wbg_ptr,t,n);if(_[1])throw b(_[0])}static fromArchive(e,t){var n=g(t)?0:f(t,o.__wbindgen_malloc,o.__wbindgen_realloc),_=a;const c=o.wasmbuilder_fromArchive(e,n,_);if(c[2])throw b(c[1]);return p.__wrap(c[0])}static fromJson(e,t){const n=f(e,o.__wbindgen_malloc,o.__wbindgen_realloc),_=a;var c=g(t)?0:f(t,o.__wbindgen_malloc,o.__wbindgen_realloc),i=a;const s=o.wasmbuilder_fromJson(n,_,c,i);if(s[2])throw b(s[1]);return p.__wrap(s[0])}getDefinition(){const e=o.wasmbuilder_getDefinition(this.__wbg_ptr);if(e[2])throw b(e[1]);return b(e[0])}static new(e){var t=g(e)?0:f(e,o.__wbindgen_malloc,o.__wbindgen_realloc),n=a;const _=o.wasmbuilder_new(t,n);if(_[2])throw b(_[1]);return p.__wrap(_[0])}setIntent(e){const t=o.wasmbuilder_setIntent(this.__wbg_ptr,e);if(t[1])throw b(t[0])}setNoEmbed(e){o.wasmbuilder_setNoEmbed(this.__wbg_ptr,e)}setRemoteUrl(e){const t=f(e,o.__wbindgen_malloc,o.__wbindgen_realloc),n=a;o.wasmbuilder_setRemoteUrl(this.__wbg_ptr,t,n)}setThumbnailFromBlob(e,t){const n=f(e,o.__wbindgen_malloc,o.__wbindgen_realloc),_=a,c=o.wasmbuilder_setThumbnailFromBlob(this.__wbg_ptr,n,_,t);if(c[1])throw b(c[0])}sign(e,t,n){const _=f(t,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a;return o.wasmbuilder_sign(this.__wbg_ptr,e,_,c,n)}signAndGetManifestBytes(e,t,n){const _=f(t,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a;return o.wasmbuilder_signAndGetManifestBytes(this.__wbg_ptr,e,_,c,n)}toArchive(){const e=o.wasmbuilder_toArchive(this.__wbg_ptr);if(e[2])throw b(e[1]);return b(e[0])}updateActionsAt(e){const t=o.wasmbuilder_updateActionsAt(this.__wbg_ptr,e);if(t[1])throw b(t[0])}}Symbol.dispose&&(p.prototype[Symbol.dispose]=p.prototype.free);class v{static __wrap(e){const t=Object.create(v.prototype);return t.__wbg_ptr=e,N.register(t,t.__wbg_ptr,t),t}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,N.unregister(this),e}free(){const e=this.__destroy_into_raw();o.__wbg_wasmreader_free(e,0)}activeLabel(){const e=o.wasmreader_activeLabel(this.__wbg_ptr);let t;return e[0]!==0&&(t=y(e[0],e[1]).slice(),o.__wbindgen_free(e[0],e[1]*1,1)),t}activeManifest(){const e=o.wasmreader_activeManifest(this.__wbg_ptr);if(e[2])throw b(e[1]);return b(e[0])}crJson(){let e,t;try{const n=o.wasmreader_crJson(this.__wbg_ptr);return e=n[0],t=n[1],y(n[0],n[1])}finally{o.__wbindgen_free(e,t,1)}}static fromBlob(e,t,n){const _=f(e,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a;var i=g(n)?0:f(n,o.__wbindgen_malloc,o.__wbindgen_realloc),s=a;return o.wasmreader_fromBlob(_,c,t,i,s)}static fromBlobFragment(e,t,n,_){const c=f(e,o.__wbindgen_malloc,o.__wbindgen_realloc),i=a;var s=g(_)?0:f(_,o.__wbindgen_malloc,o.__wbindgen_realloc),u=a;return o.wasmreader_fromBlobFragment(c,i,t,n,s,u)}json(){let e,t;try{const n=o.wasmreader_json(this.__wbg_ptr);return e=n[0],t=n[1],y(n[0],n[1])}finally{o.__wbindgen_free(e,t,1)}}manifestStore(){const e=o.wasmreader_manifestStore(this.__wbg_ptr);if(e[2])throw b(e[1]);return b(e[0])}resourceToBytes(e){const t=f(e,o.__wbindgen_malloc,o.__wbindgen_realloc),n=a,_=o.wasmreader_resourceToBytes(this.__wbg_ptr,t,n);if(_[2])throw b(_[1]);return b(_[0])}}Symbol.dispose&&(v.prototype[Symbol.dispose]=v.prototype.free);function C(r){const e=f(r,o.__wbindgen_malloc,o.__wbindgen_realloc),t=a,n=o.loadSettings(e,t);if(n[1])throw b(n[0])}function P(){return{__proto__:null,"./c2pa_bg.js":{__proto__:null,__wbg_Error_ef53bc310eb298a0:function(e,t){return Error(y(e,t))},__wbg_Number_6b506e6536831eaa:function(e){return Number(e)},__wbg___wbindgen_bigint_get_as_i64_38130e98eecd467d:function(e,t){const n=t,_=typeof n=="bigint"?n:void 0;m().setBigInt64(e+8,g(_)?BigInt(0):_,!0),m().setInt32(e+0,!g(_),!0)},__wbg___wbindgen_boolean_get_1a45e2c38d4d41b9:function(e){const t=e,n=typeof t=="boolean"?t:void 0;return g(n)?16777215:n?1:0},__wbg___wbindgen_debug_string_0accd80f45e5faa2:function(e,t){const n=U(t),_=f(n,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a;m().setInt32(e+4,c,!0),m().setInt32(e+0,_,!0)},__wbg___wbindgen_in_70a403a56e771704:function(e,t){return e in t},__wbg___wbindgen_is_bigint_6ffd6468a9bc44b9:function(e){return typeof e=="bigint"},__wbg___wbindgen_is_function_754e9f305ff6029e:function(e){return typeof e=="function"},__wbg___wbindgen_is_object_56732c2bc353f41d:function(e){const t=e;return typeof t=="object"&&t!==null},__wbg___wbindgen_is_string_c236cabd84a4d769:function(e){return typeof e=="string"},__wbg___wbindgen_is_undefined_67b456be8673d3d7:function(e){return e===void 0},__wbg___wbindgen_jsval_eq_1068e624fa87f6ab:function(e,t){return e===t},__wbg___wbindgen_jsval_loose_eq_2c56564c75129511:function(e,t){return e==t},__wbg___wbindgen_number_get_9bb1761122181af2:function(e,t){const n=t,_=typeof n=="number"?n:void 0;m().setFloat64(e+8,g(_)?0:_,!0),m().setInt32(e+0,!g(_),!0)},__wbg___wbindgen_string_get_72bdf95d3ae505b1:function(e,t){const n=t,_=typeof n=="string"?n:void 0;var c=g(_)?0:f(_,o.__wbindgen_malloc,o.__wbindgen_realloc),i=a;m().setInt32(e+4,i,!0),m().setInt32(e+0,c,!0)},__wbg___wbindgen_throw_1506f2235d1bdba0:function(e,t){throw new Error(y(e,t))},__wbg__wbg_cb_unref_61db23ac97f16c31:function(e){e._wbg_cb_unref()},__wbg_abort_2ec46222bf378517:function(e){e.abort()},__wbg_abort_b29d719932441c95:function(e,t){e.abort(t)},__wbg_append_e1746995edcb0170:function(){return l(function(e,t,n,_,c){e.append(y(t,n),y(_,c))},arguments)},__wbg_arrayBuffer_05927079aabe6d46:function(){return l(function(e){return e.arrayBuffer()},arguments)},__wbg_byteLength_2c6dc3b4b85d3547:function(e){return e.byteLength},__wbg_call_8a89609d89f6608a:function(){return l(function(e,t){return e.call(t)},arguments)},__wbg_call_9c758de292015997:function(){return l(function(e,t,n){return e.call(t,n)},arguments)},__wbg_clearTimeout_6b8d9a38b9263d65:function(e){return clearTimeout(e)},__wbg_crypto_38df2bab126b63dc:function(e){return e.crypto},__wbg_done_60cf307fcc680536:function(e){return e.done},__wbg_entries_04b37a02507f1713:function(e){return Object.entries(e)},__wbg_error_a6fa202b58aa1cd3:function(e,t){let n,_;try{n=e,_=t,console.error(y(e,t))}finally{o.__wbindgen_free(n,_,1)}},__wbg_fetch_344c8d3849002659:function(e,t){return e.fetch(t)},__wbg_fetch_9dad4fe911207b37:function(e){return fetch(e)},__wbg_from_d300fe49deab18f5:function(e){return Array.from(e)},__wbg_getRandomValues_3f44b700395062e5:function(){return l(function(e,t){globalThis.crypto.getRandomValues(A(e,t))},arguments)},__wbg_getRandomValues_76dfc69825c9c552:function(){return l(function(e,t){globalThis.crypto.getRandomValues(A(e,t))},arguments)},__wbg_getRandomValues_8aa3112c6615eef6:function(){return l(function(e,t){globalThis.crypto.getRandomValues(A(e,t))},arguments)},__wbg_getRandomValues_c44a50d8cfdaebeb:function(){return l(function(e,t){e.getRandomValues(t)},arguments)},__wbg_getTime_00b3f7db575e4ef5:function(e){return e.getTime()},__wbg_get_1f8f054ddbaa7db2:function(){return l(function(e,t){return Reflect.get(e,t)},arguments)},__wbg_get_2b48c7d0d006a781:function(e,t){return e[t>>>0]},__wbg_get_de6a0f7d4d18a304:function(){return l(function(e,t){return Reflect.get(e,t)},arguments)},__wbg_get_unchecked_33f6e5c9e2f2d6b2:function(e,t){return e[t>>>0]},__wbg_get_with_ref_key_6412cf3094599694:function(e,t){return e[t]},__wbg_has_73740b27f436fed3:function(){return l(function(e,t){return Reflect.has(e,t)},arguments)},__wbg_headers_0feb63d2d374b44a:function(e){return e.headers},__wbg_instanceof_ArrayBuffer_8f49811467741499:function(e){let t;try{t=e instanceof ArrayBuffer}catch{t=!1}return t},__wbg_instanceof_Map_9fc06d9a951bcee6:function(e){let t;try{t=e instanceof Map}catch{t=!1}return t},__wbg_instanceof_Promise_d0db99486956c8e8:function(e){let t;try{t=e instanceof Promise}catch{t=!1}return t},__wbg_instanceof_Response_cb984bd66d7bd408:function(e){let t;try{t=e instanceof Response}catch{t=!1}return t},__wbg_instanceof_Uint8Array_86f30649f63ef9c2:function(e){let t;try{t=e instanceof Uint8Array}catch{t=!1}return t},__wbg_isArray_67c2c9c4313f4448:function(e){return Array.isArray(e)},__wbg_isSafeInteger_66acec27e09e99a7:function(e){return Number.isSafeInteger(e)},__wbg_iterator_8732428d309e270e:function(){return Symbol.iterator},__wbg_length_4a591ecaa01354d9:function(e){return e.length},__wbg_length_66f1a4b2e9026940:function(e){return e.length},__wbg_msCrypto_bd5a034af96bcba6:function(e){return e.msCrypto},__wbg_new_0_445c13a750296eb6:function(){return new Date},__wbg_new_0d09705104e164af:function(){return l(function(){return new AbortController},arguments)},__wbg_new_227d7c05414eb861:function(){return new Error},__wbg_new_578aeef4b6b94378:function(e){return new Uint8Array(e)},__wbg_new_622fc80556be2e26:function(){return new Map},__wbg_new_a1b9f645bba64f0f:function(){return l(function(){return new FileReaderSync},arguments)},__wbg_new_ce1ab61c1c2b300d:function(){return new Object},__wbg_new_d90091b82fdf5b91:function(){return new Array},__wbg_new_e436d06bc8e77460:function(){return l(function(){return new Headers},arguments)},__wbg_new_from_slice_18fa1f71286d66b8:function(e,t){return new Uint8Array(A(e,t))},__wbg_new_typed_bf31d18f92484486:function(e,t){try{var n={a:e,b:t},_=(i,s)=>{const u=n.a;n.a=0;try{return H(u,n.b,i,s)}finally{n.a=u}};return new Promise(_)}finally{n.a=0}},__wbg_new_with_length_36a4998e27b014c5:function(e){return new Uint8Array(e>>>0)},__wbg_new_with_str_and_init_bcd02b79a793d27f:function(){return l(function(e,t,n){return new Request(y(e,t),n)},arguments)},__wbg_next_9e03acdf51c4960d:function(e){return e.next},__wbg_next_eb8ca7351fa27906:function(){return l(function(e){return e.next()},arguments)},__wbg_node_84ea875411254db1:function(e){return e.node},__wbg_now_190933fa139cc119:function(){return Date.now()},__wbg_process_44c7a14e11e9f69e:function(e){return e.process},__wbg_prototypesetcall_3249fc62a0fafa30:function(e,t,n){Uint8Array.prototype.set.call(A(e,t),n)},__wbg_queueMicrotask_35c611f4a14830b2:function(e){queueMicrotask(e)},__wbg_queueMicrotask_404ed0a58e0b63cc:function(e){return e.queueMicrotask},__wbg_randomFillSync_6c25eac9869eb53c:function(){return l(function(e,t){e.randomFillSync(t)},arguments)},__wbg_readAsArrayBuffer_f1b8da05559618d9:function(){return l(function(e,t){return e.readAsArrayBuffer(t)},arguments)},__wbg_require_b4edbdcf3e2a1ef0:function(){return l(function(){return module.require},arguments)},__wbg_resolve_25a7e548d5881dca:function(e){return Promise.resolve(e)},__wbg_setTimeout_f757f00851f76c42:function(e,t){return setTimeout(e,t)},__wbg_set_29c99a8aac1c01e5:function(e,t,n){e.set(A(t,n))},__wbg_set_52b1e1eb5bed906a:function(e,t,n){return e.set(t,n)},__wbg_set_6be42768c690e380:function(e,t,n){e[t]=n},__wbg_set_body_36614c7e61546809:function(e,t){e.body=t},__wbg_set_cache_488ea16c11cbf20d:function(e,t){e.cache=X[t]},__wbg_set_credentials_fa9c491a27c4bdf0:function(e,t){e.credentials=Y[t]},__wbg_set_dca99999bba88a9a:function(e,t,n){e[t>>>0]=n},__wbg_set_headers_7c1e39ece7826bec:function(e,t){e.headers=t},__wbg_set_method_7a6811dec7a4feff:function(e,t,n){e.method=y(t,n)},__wbg_set_mode_c90e3667002857d4:function(e,t){e.mode=K[t]},__wbg_set_signal_d9da62b3f215c821:function(e,t){e.signal=t},__wbg_signal_e03304a84df9ed09:function(e){return e.signal},__wbg_size_9970092b88b1094c:function(e){return e.size},__wbg_slice_02bb778501725738:function(){return l(function(e,t,n){return e.slice(t,n)},arguments)},__wbg_stack_3b0d974bbf31e44f:function(e,t){const n=t.stack,_=f(n,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a;m().setInt32(e+4,c,!0),m().setInt32(e+0,_,!0)},__wbg_static_accessor_GLOBAL_9d53f2689e622ca1:function(){const e=typeof global>"u"?null:global;return g(e)?0:R(e)},__wbg_static_accessor_GLOBAL_THIS_a1a35cec07001a8a:function(){const e=typeof globalThis>"u"?null:globalThis;return g(e)?0:R(e)},__wbg_static_accessor_SELF_4c59f6c7ea29a144:function(){const e=typeof self>"u"?null:self;return g(e)?0:R(e)},__wbg_static_accessor_WINDOW_e70ae9f2eb052253:function(){const e=typeof window>"u"?null:window;return g(e)?0:R(e)},__wbg_status_00549d55b78d949e:function(e){return e.status},__wbg_stringify_8286df6dcc591521:function(){return l(function(e){return JSON.stringify(e)},arguments)},__wbg_subarray_4aa221f6a4f5ab22:function(e,t,n){return e.subarray(t>>>0,n>>>0)},__wbg_then_18f476d590e58992:function(e,t,n){return e.then(t,n)},__wbg_then_ac7b025999b52837:function(e,t){return e.then(t)},__wbg_url_6808f1c468f2d0cd:function(e,t){const n=t.url,_=f(n,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a;m().setInt32(e+4,c,!0),m().setInt32(e+0,_,!0)},__wbg_valueOf_41ae57308c1f031c:function(e){return e.valueOf()},__wbg_value_f3625092ee4b37f4:function(e){return e.value},__wbg_versions_276b2795b1c6a219:function(e){return e.versions},__wbg_wasmreader_new:function(e){return v.__wrap(e)},__wbindgen_cast_0000000000000001:function(e,t){return J(e,t,$)},__wbindgen_cast_0000000000000002:function(e,t){return J(e,t,G)},__wbindgen_cast_0000000000000003:function(e){return e},__wbindgen_cast_0000000000000004:function(e){return e},__wbindgen_cast_0000000000000005:function(e,t){return A(e,t)},__wbindgen_cast_0000000000000006:function(e,t){return y(e,t)},__wbindgen_cast_0000000000000007:function(e){return BigInt.asUintN(64,e)},__wbindgen_cast_0000000000000008:function(e,t){var n=A(e,t).slice();return o.__wbindgen_free(e,t*1,1),n},__wbindgen_init_externref_table:function(){const e=o.__wbindgen_externrefs,t=e.grow(4);e.set(0,void 0),e.set(t+0,void 0),e.set(t+1,null),e.set(t+2,!0),e.set(t+3,!1)}}}}function G(r,e){o.wasm_bindgen_304c265eb9e6f0af___convert__closures_____invoke_______true_(r,e)}function $(r,e,t){const n=o.wasm_bindgen_304c265eb9e6f0af___convert__closures_____invoke___wasm_bindgen_304c265eb9e6f0af___JsValue__core_9b3796e30d99ddb7___result__Result_____wasm_bindgen_304c265eb9e6f0af___JsError___true_(r,e,t);if(n[1])throw b(n[0])}function H(r,e,t,n){o.wasm_bindgen_304c265eb9e6f0af___convert__closures_____invoke___js_sys_74e7014fb12660c3___Function_fn_wasm_bindgen_304c265eb9e6f0af___JsValue_____wasm_bindgen_304c265eb9e6f0af___sys__Undefined___js_sys_74e7014fb12660c3___Function_fn_wasm_bindgen_304c265eb9e6f0af___JsValue_____wasm_bindgen_304c265eb9e6f0af___sys__Undefined_______true_(r,e,t,n)}const X=["default","no-store","reload","no-cache","force-cache","only-if-cached"],Y=["omit","same-origin","include"],K=["same-origin","no-cors","cors","navigate"],k=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(r=>o.__wbg_wasmbuilder_free(r,1)),N=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(r=>o.__wbg_wasmreader_free(r,1));typeof FinalizationRegistry>"u"||new FinalizationRegistry(r=>o.__wbg_wasmsigner_free(r,1));function R(r){const e=o.__externref_table_alloc();return o.__wbindgen_externrefs.set(e,r),e}const z=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(r=>o.__wbindgen_destroy_closure(r.a,r.b));function U(r){const e=typeof r;if(e=="number"||e=="boolean"||r==null)return`${r}`;if(e=="string")return`"${r}"`;if(e=="symbol"){const _=r.description;return _==null?"Symbol":`Symbol(${_})`}if(e=="function"){const _=r.name;return typeof _=="string"&&_.length>0?`Function(${_})`:"Function"}if(Array.isArray(r)){const _=r.length;let c="[";_>0&&(c+=U(r[0]));for(let i=1;i<_;i++)c+=", "+U(r[i]);return c+="]",c}const t=/\\[object ([^\\]]+)\\]/.exec(toString.call(r));let n;if(t&&t.length>1)n=t[1];else return toString.call(r);if(n=="Object")try{return"Object("+JSON.stringify(r)+")"}catch{return"Object"}return r instanceof Error?`${r.name}: ${r.message}\n${r.stack}`:n}function A(r,e){return r=r>>>0,T().subarray(r/1,r/1+e)}let I=null;function m(){return(I===null||I.buffer.detached===!0||I.buffer.detached===void 0&&I.buffer!==o.memory.buffer)&&(I=new DataView(o.memory.buffer)),I}function y(r,e){return ee(r>>>0,e)}let S=null;function Q(){return(S===null||S.byteLength===0)&&(S=new Uint32Array(o.memory.buffer)),S}let B=null;function T(){return(B===null||B.byteLength===0)&&(B=new Uint8Array(o.memory.buffer)),B}function l(r,e){try{return r.apply(this,e)}catch(t){const n=R(t);o.__wbindgen_exn_store(n)}}function g(r){return r==null}function J(r,e,t){const n={a:r,b:e,cnt:1},_=(...c)=>{n.cnt++;const i=n.a;n.a=0;try{return t(i,n.b,...c)}finally{n.a=i,_._wbg_cb_unref()}};return _._wbg_cb_unref=()=>{--n.cnt===0&&(o.__wbindgen_destroy_closure(n.a,n.b),n.a=0,z.unregister(n))},z.register(_,n,n),_}function E(r,e){const t=e(r.length*4,4)>>>0;return Q().set(r,t/4),a=r.length,t}function f(r,e,t){if(t===void 0){const s=j.encode(r),u=e(s.length,1)>>>0;return T().subarray(u,u+s.length).set(s),a=s.length,u}let n=r.length,_=e(n,1)>>>0;const c=T();let i=0;for(;i<n;i++){const s=r.charCodeAt(i);if(s>127)break;c[_+i]=s}if(i!==n){i!==0&&(r=r.slice(i)),_=t(_,n,n=i+r.length*3,1)>>>0;const s=T().subarray(_+i,_+n),u=j.encodeInto(r,s);i+=u.written,_=t(_,n,i,1)>>>0}return a=i,_}function b(r){const e=o.__wbindgen_externrefs.get(r);return o.__externref_table_dealloc(r),e}let O=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});O.decode();const Z=2146435072;let x=0;function ee(r,e){return x+=e,x>=Z&&(O=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}),O.decode(),x=e),O.decode(T().subarray(r,r+e))}const j=new TextEncoder;"encodeInto"in j||(j.encodeInto=function(r,e){const t=j.encode(r);return e.set(t),{read:r.length,written:t.length}});let a=0,o;function te(r,e){return o=r.exports,I=null,S=null,B=null,o.__wbindgen_start(),o}function ne(r){if(o!==void 0)return o;r!==void 0&&(Object.getPrototypeOf(r)===Object.prototype?{module:r}=r:console.warn("using deprecated parameters for `initSync()`; pass a single object instead"));const e=P();r instanceof WebAssembly.Module||(r=new WebAssembly.Module(r));const t=new WebAssembly.Instance(r,e);return te(t)}function L(){let r=0;const e=new Map;return{add(t){const n=r++;return e.set(n,t),n},get(t){const n=e.get(t);if(!n)throw new Error("Attempted to use an object that has been freed");return n},remove(t){return e.delete(t)}}}const V=Symbol("transfer");function F(r,e){return{type:V,value:r,transfer:e?Array.isArray(e)?e:[e]:[r]}}function D(r){return!!(r&&typeof r=="object"&&Reflect.get(r,"type")===V)}function q(r="default"){return{createTx(e){const t=new Map,n=e??self;return n.addEventListener("message",_=>{const{data:c}=_;if(c.channelName!==r)return;const{id:i,result:s,error:u}=c,w=t.get(i);w&&(u?w.reject(u):w.resolve(s),t.delete(i))}),new Proxy({},{get(_,c){return(...i)=>{const s=re(),u=[],w=[];return i.forEach(M=>{D(M)?(u.push(M.value),w.push(...M.transfer)):u.push(M)}),n.postMessage({method:c,args:u,id:s,channelName:r},{transfer:w}),new Promise((M,se)=>{t.set(s,{resolve:M,reject:se})})}}})},rx(e,t){const n=t??self;n.addEventListener("message",async _=>{const{data:c}=_;if(c.channelName!==r)return;const{method:i,args:s,id:u}=c;try{const w=await e[i](...s);D(w)?n.postMessage({result:w.value,id:u,channelName:r},{transfer:w.transfer}):n.postMessage({result:w,id:u,channelName:r})}catch(w){n.postMessage({error:w,id:u,channelName:r})}})}}}function re(){return new Array(4).fill(0).map(()=>Math.floor(Math.random()*Number.MAX_SAFE_INTEGER).toString(16)).join("-")}const{rx:_e}=q(),{createTx:oe}=q("worker");function ce(r){if(!(r!=null&&r.manifests))return r;const e=r.manifests,t=Object.assign(Object.create(null),e),n=Object.getPrototypeOf(e);return n!==null&&n!==Object.prototype&&r.active_manifest&&(t[r.active_manifest]=n),r.manifests=t,r}const h=L(),d=L(),W=oe();_e(ie({async initWorker(r,e){ne({module:r}),e&&C(e)},async reader_fromBlob(r,e,t){const n=await v.fromBlob(r,e,t);return h.add(n)},async reader_fromBlobFragment(r,e,t,n){const _=await v.fromBlobFragment(r,e,t,n);return h.add(_)},reader_activeLabel(r){return h.get(r).activeLabel()??null},reader_manifestStore(r){const e=h.get(r);return ce(e.manifestStore())},reader_activeManifest(r){return h.get(r).activeManifest()},reader_json(r){return h.get(r).json()},reader_crJson(r){return h.get(r).crJson()},reader_resourceToBytes(r,e){const n=h.get(r).resourceToBytes(e);return F(n,n.buffer)},reader_free(r){h.get(r).free(),h.remove(r)},builder_new(r){const e=p.new(r);return d.add(e)},builder_fromJson(r,e){const t=p.fromJson(r,e);return d.add(t)},builder_fromArchive(r,e){const t=p.fromArchive(r,e);return d.add(t)},builder_setIntent(r,e){d.get(r).setIntent(e)},builder_addAction(r,e){d.get(r).addAction(e)},builder_addAssertion(r,e,t){d.get(r).addAssertion(e,t)},builder_addRedaction(r,e,t){d.get(r).addRedaction(e,t)},builder_filterActionsAt(r,e){d.get(r).filterActionsAt(Uint32Array.from(e))},builder_updateActionsAt(r,e){d.get(r).updateActionsAt(e)},builder_filterIngredientsAt(r,e){d.get(r).filterIngredientsAt(Uint32Array.from(e))},builder_filterActionsAndIngredientsAt(r,e,t){d.get(r).filterActionsAndIngredientsAt(Uint32Array.from(e),Uint32Array.from(t))},builder_setRemoteUrl(r,e){d.get(r).setRemoteUrl(e)},builder_setNoEmbed(r,e){d.get(r).setNoEmbed(e)},builder_setThumbnailFromBlob(r,e,t){d.get(r).setThumbnailFromBlob(e,t)},builder_addIngredient(r,e){d.get(r).addIngredient(e)},async builder_addIngredientFromBlob(r,e,t,n){await d.get(r).addIngredientFromBlob(e,t,n)},builder_addResourceFromBlob(r,e,t){d.get(r).addResourceFromBlob(e,t)},builder_getDefinition(r){return d.get(r).getDefinition()},builder_toArchive(r){const t=d.get(r).toArchive();return F(t,t.buffer)},async builder_sign(r,e,t,n,_){const i=await d.get(r).sign({reserveSize:t.reserveSize,alg:t.alg,sign:async s=>await W.sign(e,F(s,s.buffer),t.reserveSize)},n,_);return F(i,i.buffer)},async builder_signAndGetManifestBytes(r,e,t,n,_){const c=d.get(r),{manifest:i,asset:s}=await c.signAndGetManifestBytes({reserveSize:t.reserveSize,alg:t.alg,sign:async u=>await W.sign(e,F(u,u.buffer),t.reserveSize)},n,_);return F({manifest:i,asset:s},[i.buffer,s.buffer])},builder_free(r){d.get(r).free(),d.remove(r)}}));function ie(r){const e={};for(const[t,n]of Object.entries(r))e[t]=async(..._)=>{try{return await n(..._)}catch(c){throw typeof c=="string"?new Error(c):c}};return e}})();\n';
var A = typeof self < "u" && self.Blob && new Blob([J], { type: "text/javascript;charset=utf-8" });
function C(e) {
  let t;
  try {
    if (t = A && (self.URL || self.webkitURL).createObjectURL(A), !t) throw "";
    const i = new Worker(t, {
      name: e == null ? void 0 : e.name
    });
    return i.addEventListener("error", () => {
      (self.URL || self.webkitURL).revokeObjectURL(t);
    }), i;
  } catch {
    return new Worker(
      "data:text/javascript;charset=utf-8," + encodeURIComponent(J),
      {
        name: e == null ? void 0 : e.name
      }
    );
  } finally {
    t && (self.URL || self.webkitURL).revokeObjectURL(t);
  }
}
function q(e) {
  if (e.protocol !== "https:")
    throw new Error(
      `Worker source URL must use https, but got ${e.protocol}`
    );
  return e.toString();
}
async function G(e) {
  const { wasm: t, settingsString: i, workerSrc: r } = e;
  let n = 0;
  const _ = r ? new Worker(q(r), { type: "module" }) : new C(), o = W(_), s = /* @__PURE__ */ new Map();
  P(
    {
      sign: async (c, u, f) => {
        const d = s.get(c);
        if (s.delete(c), !d)
          throw new Error("No signer registered for request");
        const b = await d(u, f);
        return M(b, b.buffer);
      }
    },
    _
  );
  function a(c) {
    const u = n++;
    return s.set(u, c), u;
  }
  return await o.initWorker(t, i), {
    tx: o,
    registerSignReceiver: a,
    terminate: () => _.terminate()
  };
}
var v = class extends Error {
  constructor(t) {
    super(
      `The provided asset was too large. Size: ${t} bytes. Maximum: ${h2}.`
    ), this.name = "AssetTooLargeError";
  }
};
var R = class extends Error {
  constructor(t) {
    super(`Unsupported format: ${t}.`), this.name = "UnsupportedFormatError";
  }
};
var V = [
  "jpg",
  "video/mp4",
  "image/heif",
  "video/x-msvideo",
  "pdf",
  "image/png",
  "application/c2pa",
  "video/quicktime",
  "video/avi",
  "image/gif",
  "application/xml",
  "text/xml",
  "application/xhtml+xml",
  "tiff",
  "audio/wave",
  "mp4",
  "image/avif",
  "image/dng",
  "png",
  "dng",
  "image/svg+xml",
  "image/heic",
  "application/mp4",
  "image/x-nikon-nef",
  "video/msvideo",
  "tif",
  "wav",
  "xml",
  "audio/vnd.wave",
  "xhtml",
  "gif",
  "application/x-troff-msvideo",
  "webp",
  "heic",
  "application/pdf",
  "audio/mpeg",
  "application/x-c2pa-manifest-store",
  "jpeg",
  "image/x-adobe-dng",
  "audio/wav",
  "mp3",
  "mov",
  "image/tiff",
  "audio/mp4",
  "application/svg+xml",
  "arw",
  "c2pa",
  "svg",
  "avi",
  "audio/x-wav",
  "m4a",
  "image/x-sony-arw",
  "image/jpeg",
  "avif",
  "image/webp",
  "nef",
  "heif",
  "jxl",
  "image/jxl"
];
function S(e) {
  return V.includes(e);
}
var Y = {
  userAnchors: true,
  trustAnchors: true,
  trustConfig: true,
  allowedList: true
};
var X = Object.keys(Y);
var Z = {
  builder: {
    generateC2paArchive: true
  }
};
var I = 1 * 1024 * 1024;
async function l2(e, t) {
  const i = t ? merge(e ?? {}, t) : e;
  if (!i)
    return;
  const r = merge(Z, i), n = [];
  return r.trust && n.push(T(r.trust)), r.cawgTrust && n.push(T(r.cawgTrust)), await Promise.all(n), JSON.stringify(k(r));
}
function k(e) {
  return Object.entries(e).reduce(
    (i, [r, n]) => (i[K(r)] = typeof n == "object" && n !== null ? k(n) : n, i),
    {}
  );
}
function K(e) {
  return e.replace(/[A-Z]/g, (t) => `_${t.toLowerCase()}`);
}
async function T(e) {
  try {
    const t = Object.entries(e).filter(([i]) => X.includes(i)).map(async ([i, r]) => {
      if (r && typeof r == "object" && Array.isArray(r)) {
        const n = r.map(async (s) => {
          if (typeof s != "string")
            throw new Error("Expected a string value for array item");
          const a = await j(s);
          if (E(i) && !F(a))
            throw new Error(`Error parsing PEM file at: ${s}`);
          return a;
        }), o = (await Promise.all(n)).join("");
        e[i] = o;
      } else if (r && typeof r == "string" && H(r)) {
        const n = await j(r);
        if (E(i) && !F(n))
          throw new Error(`Error parsing PEM file at: ${r}`);
        e[i] = n;
      } else
        return r;
    });
    await Promise.all(t);
  } catch (t) {
    const i = t instanceof Error ? t.message : String(t);
    throw new Error(`Failed to resolve trust settings. ${i}`, { cause: t });
  }
}
var E = (e) => ["userAnchors", "trustAnchors"].includes(e);
var F = (e) => e.includes("-----BEGIN CERTIFICATE-----");
var H = (e) => e.startsWith("http");
var w = 2;
var Q = 200;
var x = 2e3;
var M2 = 3e4;
function B(e) {
  const t = Math.min(
    Q * 2 ** e,
    x
  ), i = Math.floor(Math.random() * 200);
  return Math.min(t + i, x);
}
function ee(e) {
  if (!e)
    return null;
  const t = Number(e);
  if (!Number.isNaN(t))
    return t * 1e3;
  const i = Date.parse(e);
  return Number.isNaN(i) ? null : i - Date.now();
}
async function j(e) {
  for (let t = 0; ; t++) {
    let i;
    try {
      i = await fetch(e);
    } catch (n) {
      if (t < w) {
        await new Promise((o) => setTimeout(o, B(t)));
        continue;
      }
      const _ = n instanceof Error ? n.message : String(n);
      throw new Error(`Network error fetching ${e}: ${_}`, { cause: n });
    }
    if (!i.ok) {
      if (i.status === 429 || i.status >= 500) {
        if (i.status === 429) {
          const _ = ee(i.headers.get("retry-after"));
          if (_ !== null) {
            if (_ > M2)
              throw new Error(
                `Failed to fetch ${e}: server requested a Retry-After delay of ${Math.ceil(_ / 1e3)}s, which exceeds the maximum allowed delay of ${M2 / 1e3}s`
              );
            if (t < w) {
              await new Promise((o) => setTimeout(o, Math.max(_, 0)));
              continue;
            }
            throw new Error(`Failed to fetch ${e}: ${i.status} ${i.statusText}`);
          }
        }
        if (t < w) {
          await new Promise((_) => setTimeout(_, B(t)));
          continue;
        }
      }
      throw new Error(`Failed to fetch ${e}: ${i.status} ${i.statusText}`);
    }
    const r = await i.text();
    if (r.length > I)
      throw new Error(`Response from ${e} is too large. Max size is ${I} bytes.`);
    return r;
  }
}
var h2 = 10 ** 9;
function te(e, t) {
  const { tx: i } = e, r = t, n = new FinalizationRegistry(async (_) => {
    await i.reader_free(_);
  });
  return {
    async fromBlob(_, o, s) {
      if (!S(_))
        throw new R(_);
      if (o.size > h2)
        throw new v(o.size);
      try {
        const a = await l2(r, s), c = await i.reader_fromBlob(_, o, a), u = N(e, c, () => {
          n.unregister(u);
        });
        return n.register(u, c, u), u;
      } catch (a) {
        return U(a);
      }
    },
    async fromBlobFragment(_, o, s, a) {
      if (!S(_))
        throw new R(_);
      if (o.size > h2)
        throw new v(o.size);
      try {
        const c = await l2(r, a), u = await i.reader_fromBlobFragment(
          _,
          o,
          s,
          c
        ), f = N(e, u, () => {
          n.unregister(f);
        });
        return n.register(f, u, f), f;
      } catch (c) {
        return U(c);
      }
    }
  };
}
function U(e) {
  if (e instanceof Error && e.message === "C2pa(JumbfNotFound)")
    return null;
  throw e;
}
function N(e, t, i) {
  const { tx: r } = e;
  return {
    async activeLabel() {
      return await r.reader_activeLabel(t);
    },
    async manifestStore() {
      return await r.reader_manifestStore(t);
    },
    async activeManifest() {
      return await r.reader_activeManifest(t);
    },
    async json() {
      const n = await r.reader_json(t);
      return JSON.parse(n);
    },
    async crJson() {
      const n = await r.reader_crJson(t);
      return JSON.parse(n);
    },
    async resourceToBytes(n) {
      return await r.reader_resourceToBytes(t, n);
    },
    async free() {
      i(), await r.reader_free(t);
    }
  };
}
typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => g2.__wbg_wasmbuilder_free(e, 1));
typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => g2.__wbg_wasmreader_free(e, 1));
typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => g2.__wbg_wasmsigner_free(e, 1));
typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => g2.__wbindgen_destroy_closure(e.a, e.b));
var ne = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
ne.decode();
var m = new TextEncoder();
"encodeInto" in m || (m.encodeInto = function(e, t) {
  const i = m.encode(e);
  return t.set(i), {
    read: e.length,
    written: i.length
  };
});
var g2;
var re = "sha512-JDgJjxNbd/twwreFXlKMWAMvONRRKQot0lqVEL/GA4Uw5j4kTw1fSfLy14JE/mX1gyzDZdZsE+a8eg1QZkJ04Q==";
async function O(e) {
  const { alg: t } = e;
  return {
    reserveSize: await e.reserveSize(),
    alg: t
  };
}
function L(e) {
  return D(e).flat();
}
function D(e) {
  return (e.assertions ?? []).filter((t) => t.label.startsWith("c2pa.actions")).map((t) => {
    const i = t.data;
    return (i == null ? void 0 : i.actions) ?? [];
  });
}
function ie(e, t) {
  const i = t, { tx: r } = e, n = new FinalizationRegistry((_) => {
    r.builder_free(_);
  });
  return {
    async new(_) {
      const o = await l2(i, _), s = await r.builder_new(o), a = y(e, s, () => {
        n.unregister(a);
      });
      return n.register(a, s, a), a;
    },
    async fromDefinition(_, o) {
      const s = JSON.stringify(_), a = await l2(i, o), c = await r.builder_fromJson(s, a), u = y(e, c, () => {
        n.unregister(u);
      });
      return n.register(u, c, u), u;
    },
    async fromArchive(_, o) {
      const s = await l2(i, o), a = await r.builder_fromArchive(_, s), c = y(e, a, () => {
        n.unregister(c);
      });
      return n.register(c, a, c), c;
    }
  };
}
function y(e, t, i) {
  const { tx: r } = e;
  return {
    async setIntent(n) {
      await r.builder_setIntent(t, n);
    },
    async addAction(n) {
      await r.builder_addAction(t, n);
    },
    async addAssertion(n, _) {
      await r.builder_addAssertion(t, n, _);
    },
    async addRedaction(n, _) {
      await r.builder_addRedaction(t, n, _);
    },
    async setRemoteUrl(n) {
      await r.builder_setRemoteUrl(t, n);
    },
    async setNoEmbed(n) {
      await r.builder_setNoEmbed(t, n);
    },
    async setThumbnailFromBlob(n, _) {
      await r.builder_setThumbnailFromBlob(t, n, _);
    },
    // Unlike the Node binding, Neon, which can invoke the JS predicate synchronously from Rust,
    // the WASM builder lives in a Web Worker. A predicate closure can't be called across the
    // worker boundary, so we evaluate it here on the main thread and send the resulting indices
    // to the worker, where WASM applies the equivalent index-based filter. The action/ingredient
    // ordering here must match what WASM iterates. See `filterActionsAt` and `filterIngredientsAt`.
    async filterActions(n) {
      const _ = await r.builder_getDefinition(t), s = L(_).reduce((a, c, u) => (n(c) && a.push(u), a), []);
      await r.builder_filterActionsAt(t, s);
    },
    async filterIngredients(n) {
      const s = ((await r.builder_getDefinition(t)).ingredients ?? []).reduce((a, c, u) => (n(c) && a.push(u), a), []);
      await r.builder_filterIngredientsAt(t, s);
    },
    async filterActionsAndIngredients(n, _) {
      const o = await r.builder_getDefinition(t), a = L(o).reduce((f, d, b) => (n(d) && f.push(b), f), []), u = (o.ingredients ?? []).reduce(
        (f, d, b) => (_(d) && f.push(b), f),
        []
      );
      await r.builder_filterActionsAndIngredientsAt(
        t,
        a,
        u
      );
    },
    async updateActions(n) {
      const _ = await r.builder_getDefinition(t), s = D(_).map((a) => n(a));
      await r.builder_updateActionsAt(t, s);
    },
    async addIngredient(n) {
      const _ = JSON.stringify(n);
      await r.builder_addIngredient(t, _);
    },
    async addIngredientFromBlob(n, _, o) {
      const s = JSON.stringify(n);
      await r.builder_addIngredientFromBlob(t, s, _, o);
    },
    async addResourceFromBlob(n, _) {
      await r.builder_addResourceFromBlob(t, n, _);
    },
    async getDefinition() {
      return await r.builder_getDefinition(t);
    },
    async toArchive() {
      return await r.builder_toArchive(t);
    },
    async sign(n, _, o) {
      const s = await O(n), a = e.registerSignReceiver(n.sign);
      return await r.builder_sign(
        t,
        a,
        s,
        _,
        o
      );
    },
    async signAndGetManifestBytes(n, _, o) {
      const s = await O(n), a = e.registerSignReceiver(n.sign);
      return await r.builder_signAndGetManifestBytes(
        t,
        a,
        s,
        _,
        o
      );
    },
    async free() {
      i(), await r.builder_free(t);
    }
  };
}
async function ue(e) {
  const { wasmSrc: t, workerSrc: i, settings: r } = e, n = typeof t == "string" ? await _e(t) : t, _ = await l2(r, void 0), o = await G({ wasm: n, workerSrc: i, settingsString: _ });
  return {
    reader: te(o, r),
    builder: ie(o, r),
    dispose: o.terminate
  };
}
async function _e(e) {
  const t = await fetch(e, { integrity: re });
  return await WebAssembly.compileStreaming(t);
}
export {
  V as READER_SUPPORTED_FORMATS,
  ue as createC2pa,
  S as isSupportedReaderFormat
};
