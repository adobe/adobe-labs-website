// node_modules/highgain/dist/index.js
var l = /* @__PURE__ */ Symbol("transfer");
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
      const f2 = /* @__PURE__ */ new Map(), n = r ?? self;
      return n.addEventListener("message", (u) => {
        const { data: o } = u;
        if (o.channelName !== e)
          return;
        const { id: a, result: s, error: t } = o, c2 = f2.get(a);
        c2 && (t ? c2.reject(t) : c2.resolve(s), f2.delete(a));
      }), new Proxy(
        {},
        {
          get(u, o) {
            return (...a) => {
              const s = g(), t = [], c2 = [];
              return a.forEach((i2) => {
                p(i2) ? (t.push(i2.value), c2.push(...i2.transfer)) : t.push(i2);
              }), n.postMessage(
                { method: o, args: t, id: s, channelName: e },
                { transfer: c2 }
              ), new Promise((i2, y2) => {
                f2.set(s, { resolve: i2, reject: y2 });
              });
            };
          }
        }
      );
    },
    rx(r, f2) {
      const n = f2 ?? self;
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

// node_modules/@contentauth/c2pa-web/dist/c2pa-DIv7lJlp.js
var ne = Object.defineProperty;
var $ = (n) => {
  throw TypeError(n);
};
var re = (n, e, t) => e in n ? ne(n, e, { enumerable: true, configurable: true, writable: true, value: t }) : n[e] = t;
var O = (n, e, t) => re(n, typeof e != "symbol" ? e + "" : e, t);
var k = (n, e, t) => e.has(n) || $("Cannot " + t);
var i = (n, e, t) => (k(n, e, "read from private field"), t ? t.call(n) : e.get(n));
var v = (n, e, t) => e.has(n) ? $("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t);
var S = (n, e, t, r) => (k(n, e, "write to private field"), r ? r.call(n, t) : e.set(n, t), t);
var { createTx: ie, rx: Ue } = h();
var { createTx: Le, rx: se } = h("worker");
var K = '(function(){"use strict";class p{static __wrap(e){const t=Object.create(p.prototype);return t.__wbg_ptr=e,z.register(t,t.__wbg_ptr,t),t}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,z.unregister(this),e}free(){const e=this.__destroy_into_raw();o.__wbg_wasmbuilder_free(e,0)}addAction(e){const t=o.wasmbuilder_addAction(this.__wbg_ptr,e);if(t[1])throw b(t[0])}addAssertion(e,t){const n=d(e,o.__wbindgen_malloc,o.__wbindgen_realloc),_=a,c=o.wasmbuilder_addAssertion(this.__wbg_ptr,n,_,t);if(c[1])throw b(c[0])}addIngredient(e){const t=d(e,o.__wbindgen_malloc,o.__wbindgen_realloc),n=a,_=o.wasmbuilder_addIngredient(this.__wbg_ptr,t,n);if(_[1])throw b(_[0])}addIngredientFromBlob(e,t,n){const _=d(e,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a,s=d(t,o.__wbindgen_malloc,o.__wbindgen_realloc),i=a;return o.wasmbuilder_addIngredientFromBlob(this.__wbg_ptr,_,c,s,i,n)}addRedaction(e,t){const n=d(e,o.__wbindgen_malloc,o.__wbindgen_realloc),_=a,c=o.wasmbuilder_addRedaction(this.__wbg_ptr,n,_,t);if(c[1])throw b(c[0])}addResourceFromBlob(e,t){const n=d(e,o.__wbindgen_malloc,o.__wbindgen_realloc),_=a,c=o.wasmbuilder_addResourceFromBlob(this.__wbg_ptr,n,_,t);if(c[1])throw b(c[0])}filterActionsAndIngredientsAt(e,t){const n=E(e,o.__wbindgen_malloc),_=a,c=E(t,o.__wbindgen_malloc),s=a,i=o.wasmbuilder_filterActionsAndIngredientsAt(this.__wbg_ptr,n,_,c,s);if(i[1])throw b(i[0])}filterActionsAt(e){const t=E(e,o.__wbindgen_malloc),n=a,_=o.wasmbuilder_filterActionsAt(this.__wbg_ptr,t,n);if(_[1])throw b(_[0])}filterIngredientsAt(e){const t=E(e,o.__wbindgen_malloc),n=a,_=o.wasmbuilder_filterIngredientsAt(this.__wbg_ptr,t,n);if(_[1])throw b(_[0])}static fromArchive(e,t){var n=w(t)?0:d(t,o.__wbindgen_malloc,o.__wbindgen_realloc),_=a;const c=o.wasmbuilder_fromArchive(e,n,_);if(c[2])throw b(c[1]);return p.__wrap(c[0])}static fromJson(e,t){const n=d(e,o.__wbindgen_malloc,o.__wbindgen_realloc),_=a;var c=w(t)?0:d(t,o.__wbindgen_malloc,o.__wbindgen_realloc),s=a;const i=o.wasmbuilder_fromJson(n,_,c,s);if(i[2])throw b(i[1]);return p.__wrap(i[0])}getDefinition(){const e=o.wasmbuilder_getDefinition(this.__wbg_ptr);if(e[2])throw b(e[1]);return b(e[0])}static new(e){var t=w(e)?0:d(e,o.__wbindgen_malloc,o.__wbindgen_realloc),n=a;const _=o.wasmbuilder_new(t,n);if(_[2])throw b(_[1]);return p.__wrap(_[0])}setIntent(e){const t=o.wasmbuilder_setIntent(this.__wbg_ptr,e);if(t[1])throw b(t[0])}setNoEmbed(e){o.wasmbuilder_setNoEmbed(this.__wbg_ptr,e)}setRemoteUrl(e){const t=d(e,o.__wbindgen_malloc,o.__wbindgen_realloc),n=a;o.wasmbuilder_setRemoteUrl(this.__wbg_ptr,t,n)}setThumbnailFromBlob(e,t){const n=d(e,o.__wbindgen_malloc,o.__wbindgen_realloc),_=a,c=o.wasmbuilder_setThumbnailFromBlob(this.__wbg_ptr,n,_,t);if(c[1])throw b(c[0])}sign(e,t,n,_){const c=d(n,o.__wbindgen_malloc,o.__wbindgen_realloc),s=a;return o.wasmbuilder_sign(this.__wbg_ptr,e,t,c,s,_)}signAndGetManifestBytes(e,t,n,_){const c=d(n,o.__wbindgen_malloc,o.__wbindgen_realloc),s=a;return o.wasmbuilder_signAndGetManifestBytes(this.__wbg_ptr,e,t,c,s,_)}toArchive(){const e=o.wasmbuilder_toArchive(this.__wbg_ptr);if(e[2])throw b(e[1]);return b(e[0])}updateActionsAt(e){const t=o.wasmbuilder_updateActionsAt(this.__wbg_ptr,e);if(t[1])throw b(t[0])}}Symbol.dispose&&(p.prototype[Symbol.dispose]=p.prototype.free);class I{static __wrap(e){const t=Object.create(I.prototype);return t.__wbg_ptr=e,N.register(t,t.__wbg_ptr,t),t}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,N.unregister(this),e}free(){const e=this.__destroy_into_raw();o.__wbg_wasmreader_free(e,0)}activeLabel(){const e=o.wasmreader_activeLabel(this.__wbg_ptr);let t;return e[0]!==0&&(t=y(e[0],e[1]).slice(),o.__wbindgen_free(e[0],e[1]*1,1)),t}activeManifest(){const e=o.wasmreader_activeManifest(this.__wbg_ptr);if(e[2])throw b(e[1]);return b(e[0])}crJson(){let e,t;try{const n=o.wasmreader_crJson(this.__wbg_ptr);return e=n[0],t=n[1],y(n[0],n[1])}finally{o.__wbindgen_free(e,t,1)}}static fromBlob(e,t,n){const _=d(e,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a;var s=w(n)?0:d(n,o.__wbindgen_malloc,o.__wbindgen_realloc),i=a;return o.wasmreader_fromBlob(_,c,t,s,i)}static fromBlobFragment(e,t,n,_){const c=d(e,o.__wbindgen_malloc,o.__wbindgen_realloc),s=a;var i=w(_)?0:d(_,o.__wbindgen_malloc,o.__wbindgen_realloc),u=a;return o.wasmreader_fromBlobFragment(c,s,t,n,i,u)}static fromBytes(e,t,n){const _=d(e,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a,s=Z(t,o.__wbindgen_malloc),i=a;var u=w(n)?0:d(n,o.__wbindgen_malloc,o.__wbindgen_realloc),g=a;return o.wasmreader_fromBytes(_,c,s,i,u,g)}json(){let e,t;try{const n=o.wasmreader_json(this.__wbg_ptr);return e=n[0],t=n[1],y(n[0],n[1])}finally{o.__wbindgen_free(e,t,1)}}manifestStore(){const e=o.wasmreader_manifestStore(this.__wbg_ptr);if(e[2])throw b(e[1]);return b(e[0])}resourceToBytes(e){const t=d(e,o.__wbindgen_malloc,o.__wbindgen_realloc),n=a,_=o.wasmreader_resourceToBytes(this.__wbg_ptr,t,n);if(_[2])throw b(_[1]);return b(_[0])}}Symbol.dispose&&(I.prototype[Symbol.dispose]=I.prototype.free);function P(){return{__proto__:null,"./c2pa_bg.js":{__proto__:null,__wbg_Error_ef53bc310eb298a0:function(e,t){return Error(y(e,t))},__wbg_Number_6b506e6536831eaa:function(e){return Number(e)},__wbg_String_8564e559799eccda:function(e,t){const n=String(t),_=d(n,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a;m().setInt32(e+4,c,!0),m().setInt32(e+0,_,!0)},__wbg___wbindgen_bigint_get_as_i64_38130e98eecd467d:function(e,t){const n=t,_=typeof n=="bigint"?n:void 0;m().setBigInt64(e+8,w(_)?BigInt(0):_,!0),m().setInt32(e+0,!w(_),!0)},__wbg___wbindgen_boolean_get_1a45e2c38d4d41b9:function(e){const t=e,n=typeof t=="boolean"?t:void 0;return w(n)?16777215:n?1:0},__wbg___wbindgen_debug_string_0accd80f45e5faa2:function(e,t){const n=U(t),_=d(n,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a;m().setInt32(e+4,c,!0),m().setInt32(e+0,_,!0)},__wbg___wbindgen_in_70a403a56e771704:function(e,t){return e in t},__wbg___wbindgen_is_bigint_6ffd6468a9bc44b9:function(e){return typeof e=="bigint"},__wbg___wbindgen_is_function_754e9f305ff6029e:function(e){return typeof e=="function"},__wbg___wbindgen_is_null_87c3bfe968c6a5ad:function(e){return e===null},__wbg___wbindgen_is_object_56732c2bc353f41d:function(e){const t=e;return typeof t=="object"&&t!==null},__wbg___wbindgen_is_string_c236cabd84a4d769:function(e){return typeof e=="string"},__wbg___wbindgen_is_undefined_67b456be8673d3d7:function(e){return e===void 0},__wbg___wbindgen_jsval_eq_1068e624fa87f6ab:function(e,t){return e===t},__wbg___wbindgen_jsval_loose_eq_2c56564c75129511:function(e,t){return e==t},__wbg___wbindgen_number_get_9bb1761122181af2:function(e,t){const n=t,_=typeof n=="number"?n:void 0;m().setFloat64(e+8,w(_)?0:_,!0),m().setInt32(e+0,!w(_),!0)},__wbg___wbindgen_string_get_72bdf95d3ae505b1:function(e,t){const n=t,_=typeof n=="string"?n:void 0;var c=w(_)?0:d(_,o.__wbindgen_malloc,o.__wbindgen_realloc),s=a;m().setInt32(e+4,s,!0),m().setInt32(e+0,c,!0)},__wbg___wbindgen_throw_1506f2235d1bdba0:function(e,t){throw new Error(y(e,t))},__wbg__wbg_cb_unref_61db23ac97f16c31:function(e){e._wbg_cb_unref()},__wbg_abort_2ec46222bf378517:function(e){e.abort()},__wbg_abort_b29d719932441c95:function(e,t){e.abort(t)},__wbg_append_e1746995edcb0170:function(){return l(function(e,t,n,_,c){e.append(y(t,n),y(_,c))},arguments)},__wbg_arrayBuffer_05927079aabe6d46:function(){return l(function(e){return e.arrayBuffer()},arguments)},__wbg_byteLength_2c6dc3b4b85d3547:function(e){return e.byteLength},__wbg_call_8a89609d89f6608a:function(){return l(function(e,t){return e.call(t)},arguments)},__wbg_call_9c758de292015997:function(){return l(function(e,t,n){return e.call(t,n)},arguments)},__wbg_clearTimeout_6b8d9a38b9263d65:function(e){return clearTimeout(e)},__wbg_crypto_38df2bab126b63dc:function(e){return e.crypto},__wbg_done_60cf307fcc680536:function(e){return e.done},__wbg_entries_04b37a02507f1713:function(e){return Object.entries(e)},__wbg_error_a6fa202b58aa1cd3:function(e,t){let n,_;try{n=e,_=t,console.error(y(e,t))}finally{o.__wbindgen_free(n,_,1)}},__wbg_fetch_344c8d3849002659:function(e,t){return e.fetch(t)},__wbg_fetch_9dad4fe911207b37:function(e){return fetch(e)},__wbg_from_d300fe49deab18f5:function(e){return Array.from(e)},__wbg_getRandomValues_3f44b700395062e5:function(){return l(function(e,t){globalThis.crypto.getRandomValues(A(e,t))},arguments)},__wbg_getRandomValues_76dfc69825c9c552:function(){return l(function(e,t){globalThis.crypto.getRandomValues(A(e,t))},arguments)},__wbg_getRandomValues_8aa3112c6615eef6:function(){return l(function(e,t){globalThis.crypto.getRandomValues(A(e,t))},arguments)},__wbg_getRandomValues_c44a50d8cfdaebeb:function(){return l(function(e,t){e.getRandomValues(t)},arguments)},__wbg_getTime_00b3f7db575e4ef5:function(e){return e.getTime()},__wbg_get_1f8f054ddbaa7db2:function(){return l(function(e,t){return Reflect.get(e,t)},arguments)},__wbg_get_2b48c7d0d006a781:function(e,t){return e[t>>>0]},__wbg_get_de6a0f7d4d18a304:function(){return l(function(e,t){return Reflect.get(e,t)},arguments)},__wbg_get_unchecked_33f6e5c9e2f2d6b2:function(e,t){return e[t>>>0]},__wbg_get_with_ref_key_6412cf3094599694:function(e,t){return e[t]},__wbg_has_73740b27f436fed3:function(){return l(function(e,t){return Reflect.has(e,t)},arguments)},__wbg_headers_0feb63d2d374b44a:function(e){return e.headers},__wbg_instanceof_ArrayBuffer_8f49811467741499:function(e){let t;try{t=e instanceof ArrayBuffer}catch{t=!1}return t},__wbg_instanceof_Map_9fc06d9a951bcee6:function(e){let t;try{t=e instanceof Map}catch{t=!1}return t},__wbg_instanceof_Promise_d0db99486956c8e8:function(e){let t;try{t=e instanceof Promise}catch{t=!1}return t},__wbg_instanceof_Response_cb984bd66d7bd408:function(e){let t;try{t=e instanceof Response}catch{t=!1}return t},__wbg_instanceof_Uint8Array_86f30649f63ef9c2:function(e){let t;try{t=e instanceof Uint8Array}catch{t=!1}return t},__wbg_isArray_67c2c9c4313f4448:function(e){return Array.isArray(e)},__wbg_isSafeInteger_66acec27e09e99a7:function(e){return Number.isSafeInteger(e)},__wbg_iterator_8732428d309e270e:function(){return Symbol.iterator},__wbg_length_4a591ecaa01354d9:function(e){return e.length},__wbg_length_66f1a4b2e9026940:function(e){return e.length},__wbg_msCrypto_bd5a034af96bcba6:function(e){return e.msCrypto},__wbg_new_0_445c13a750296eb6:function(){return new Date},__wbg_new_0d09705104e164af:function(){return l(function(){return new AbortController},arguments)},__wbg_new_227d7c05414eb861:function(){return new Error},__wbg_new_578aeef4b6b94378:function(e){return new Uint8Array(e)},__wbg_new_622fc80556be2e26:function(){return new Map},__wbg_new_a1b9f645bba64f0f:function(){return l(function(){return new FileReaderSync},arguments)},__wbg_new_ce1ab61c1c2b300d:function(){return new Object},__wbg_new_d90091b82fdf5b91:function(){return new Array},__wbg_new_e436d06bc8e77460:function(){return l(function(){return new Headers},arguments)},__wbg_new_from_slice_18fa1f71286d66b8:function(e,t){return new Uint8Array(A(e,t))},__wbg_new_typed_bf31d18f92484486:function(e,t){try{var n={a:e,b:t},_=(s,i)=>{const u=n.a;n.a=0;try{return H(u,n.b,s,i)}finally{n.a=u}};return new Promise(_)}finally{n.a=0}},__wbg_new_with_length_36a4998e27b014c5:function(e){return new Uint8Array(e>>>0)},__wbg_new_with_str_and_init_bcd02b79a793d27f:function(){return l(function(e,t,n){return new Request(y(e,t),n)},arguments)},__wbg_next_9e03acdf51c4960d:function(e){return e.next},__wbg_next_eb8ca7351fa27906:function(){return l(function(e){return e.next()},arguments)},__wbg_node_84ea875411254db1:function(e){return e.node},__wbg_now_190933fa139cc119:function(){return Date.now()},__wbg_process_44c7a14e11e9f69e:function(e){return e.process},__wbg_prototypesetcall_3249fc62a0fafa30:function(e,t,n){Uint8Array.prototype.set.call(A(e,t),n)},__wbg_queueMicrotask_35c611f4a14830b2:function(e){queueMicrotask(e)},__wbg_queueMicrotask_404ed0a58e0b63cc:function(e){return e.queueMicrotask},__wbg_randomFillSync_6c25eac9869eb53c:function(){return l(function(e,t){e.randomFillSync(t)},arguments)},__wbg_readAsArrayBuffer_f1b8da05559618d9:function(){return l(function(e,t){return e.readAsArrayBuffer(t)},arguments)},__wbg_require_b4edbdcf3e2a1ef0:function(){return l(function(){return module.require},arguments)},__wbg_resolve_25a7e548d5881dca:function(e){return Promise.resolve(e)},__wbg_setTimeout_f757f00851f76c42:function(e,t){return setTimeout(e,t)},__wbg_set_29c99a8aac1c01e5:function(e,t,n){e.set(A(t,n))},__wbg_set_52b1e1eb5bed906a:function(e,t,n){return e.set(t,n)},__wbg_set_6be42768c690e380:function(e,t,n){e[t]=n},__wbg_set_body_36614c7e61546809:function(e,t){e.body=t},__wbg_set_cache_488ea16c11cbf20d:function(e,t){e.cache=X[t]},__wbg_set_credentials_fa9c491a27c4bdf0:function(e,t){e.credentials=Y[t]},__wbg_set_dca99999bba88a9a:function(e,t,n){e[t>>>0]=n},__wbg_set_headers_7c1e39ece7826bec:function(e,t){e.headers=t},__wbg_set_method_7a6811dec7a4feff:function(e,t,n){e.method=y(t,n)},__wbg_set_mode_c90e3667002857d4:function(e,t){e.mode=K[t]},__wbg_set_signal_d9da62b3f215c821:function(e,t){e.signal=t},__wbg_signal_e03304a84df9ed09:function(e){return e.signal},__wbg_size_9970092b88b1094c:function(e){return e.size},__wbg_slice_02bb778501725738:function(){return l(function(e,t,n){return e.slice(t,n)},arguments)},__wbg_stack_3b0d974bbf31e44f:function(e,t){const n=t.stack,_=d(n,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a;m().setInt32(e+4,c,!0),m().setInt32(e+0,_,!0)},__wbg_static_accessor_GLOBAL_9d53f2689e622ca1:function(){const e=typeof global>"u"?null:global;return w(e)?0:S(e)},__wbg_static_accessor_GLOBAL_THIS_a1a35cec07001a8a:function(){const e=typeof globalThis>"u"?null:globalThis;return w(e)?0:S(e)},__wbg_static_accessor_SELF_4c59f6c7ea29a144:function(){const e=typeof self>"u"?null:self;return w(e)?0:S(e)},__wbg_static_accessor_WINDOW_e70ae9f2eb052253:function(){const e=typeof window>"u"?null:window;return w(e)?0:S(e)},__wbg_status_00549d55b78d949e:function(e){return e.status},__wbg_stringify_8286df6dcc591521:function(){return l(function(e){return JSON.stringify(e)},arguments)},__wbg_subarray_4aa221f6a4f5ab22:function(e,t,n){return e.subarray(t>>>0,n>>>0)},__wbg_then_18f476d590e58992:function(e,t,n){return e.then(t,n)},__wbg_then_ac7b025999b52837:function(e,t){return e.then(t)},__wbg_url_6808f1c468f2d0cd:function(e,t){const n=t.url,_=d(n,o.__wbindgen_malloc,o.__wbindgen_realloc),c=a;m().setInt32(e+4,c,!0),m().setInt32(e+0,_,!0)},__wbg_valueOf_41ae57308c1f031c:function(e){return e.valueOf()},__wbg_value_f3625092ee4b37f4:function(e){return e.value},__wbg_versions_276b2795b1c6a219:function(e){return e.versions},__wbg_wasmreader_new:function(e){return I.__wrap(e)},__wbindgen_cast_0000000000000001:function(e,t){return L(e,t,$)},__wbindgen_cast_0000000000000002:function(e,t){return L(e,t,G)},__wbindgen_cast_0000000000000003:function(e){return e},__wbindgen_cast_0000000000000004:function(e){return e},__wbindgen_cast_0000000000000005:function(e,t){return A(e,t)},__wbindgen_cast_0000000000000006:function(e,t){return y(e,t)},__wbindgen_cast_0000000000000007:function(e){return BigInt.asUintN(64,e)},__wbindgen_cast_0000000000000008:function(e,t){var n=A(e,t).slice();return o.__wbindgen_free(e,t*1,1),n},__wbindgen_init_externref_table:function(){const e=o.__wbindgen_externrefs,t=e.grow(4);e.set(0,void 0),e.set(t+0,void 0),e.set(t+1,null),e.set(t+2,!0),e.set(t+3,!1)}}}}function G(r,e){o.wasm_bindgen_4d7940e3be85a6dc___convert__closures_____invoke_______true_(r,e)}function $(r,e,t){const n=o.wasm_bindgen_4d7940e3be85a6dc___convert__closures_____invoke___wasm_bindgen_4d7940e3be85a6dc___JsValue__core_ed718c3d60ebd546___result__Result_____wasm_bindgen_4d7940e3be85a6dc___JsError___true_(r,e,t);if(n[1])throw b(n[0])}function H(r,e,t,n){o.wasm_bindgen_4d7940e3be85a6dc___convert__closures_____invoke___js_sys_a576b80f2209464___Function_fn_wasm_bindgen_4d7940e3be85a6dc___JsValue_____wasm_bindgen_4d7940e3be85a6dc___sys__Undefined___js_sys_a576b80f2209464___Function_fn_wasm_bindgen_4d7940e3be85a6dc___JsValue_____wasm_bindgen_4d7940e3be85a6dc___sys__Undefined_______true_(r,e,t,n)}const X=["default","no-store","reload","no-cache","force-cache","only-if-cached"],Y=["omit","same-origin","include"],K=["same-origin","no-cors","cors","navigate"],z=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(r=>o.__wbg_wasmbuilder_free(r,1)),N=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(r=>o.__wbg_wasmreader_free(r,1));typeof FinalizationRegistry>"u"||new FinalizationRegistry(r=>o.__wbg_wasmsigner_free(r,1));function S(r){const e=o.__externref_table_alloc();return o.__wbindgen_externrefs.set(e,r),e}const J=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(r=>o.__wbindgen_destroy_closure(r.a,r.b));function U(r){const e=typeof r;if(e=="number"||e=="boolean"||r==null)return`${r}`;if(e=="string")return`"${r}"`;if(e=="symbol"){const _=r.description;return _==null?"Symbol":`Symbol(${_})`}if(e=="function"){const _=r.name;return typeof _=="string"&&_.length>0?`Function(${_})`:"Function"}if(Array.isArray(r)){const _=r.length;let c="[";_>0&&(c+=U(r[0]));for(let s=1;s<_;s++)c+=", "+U(r[s]);return c+="]",c}const t=/\\[object ([^\\]]+)\\]/.exec(toString.call(r));let n;if(t&&t.length>1)n=t[1];else return toString.call(r);if(n=="Object")try{return"Object("+JSON.stringify(r)+")"}catch{return"Object"}return r instanceof Error?`${r.name}: ${r.message}\n${r.stack}`:n}function A(r,e){return r=r>>>0,R().subarray(r/1,r/1+e)}let F=null;function m(){return(F===null||F.buffer.detached===!0||F.buffer.detached===void 0&&F.buffer!==o.memory.buffer)&&(F=new DataView(o.memory.buffer)),F}function y(r,e){return te(r>>>0,e)}let B=null;function Q(){return(B===null||B.byteLength===0)&&(B=new Uint32Array(o.memory.buffer)),B}let T=null;function R(){return(T===null||T.byteLength===0)&&(T=new Uint8Array(o.memory.buffer)),T}function l(r,e){try{return r.apply(this,e)}catch(t){const n=S(t);o.__wbindgen_exn_store(n)}}function w(r){return r==null}function L(r,e,t){const n={a:r,b:e,cnt:1},_=(...c)=>{n.cnt++;const s=n.a;n.a=0;try{return t(s,n.b,...c)}finally{n.a=s,_._wbg_cb_unref()}};return _._wbg_cb_unref=()=>{--n.cnt===0&&(o.__wbindgen_destroy_closure(n.a,n.b),n.a=0,J.unregister(n))},J.register(_,n,n),_}function E(r,e){const t=e(r.length*4,4)>>>0;return Q().set(r,t/4),a=r.length,t}function Z(r,e){const t=e(r.length*1,1)>>>0;return R().set(r,t/1),a=r.length,t}function d(r,e,t){if(t===void 0){const i=j.encode(r),u=e(i.length,1)>>>0;return R().subarray(u,u+i.length).set(i),a=i.length,u}let n=r.length,_=e(n,1)>>>0;const c=R();let s=0;for(;s<n;s++){const i=r.charCodeAt(s);if(i>127)break;c[_+s]=i}if(s!==n){s!==0&&(r=r.slice(s)),_=t(_,n,n=s+r.length*3,1)>>>0;const i=R().subarray(_+s,_+n),u=j.encodeInto(r,i);s+=u.written,_=t(_,n,s,1)>>>0}return a=s,_}function b(r){const e=o.__wbindgen_externrefs.get(r);return o.__externref_table_dealloc(r),e}let O=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});O.decode();const ee=2146435072;let x=0;function te(r,e){return x+=e,x>=ee&&(O=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}),O.decode(),x=e),O.decode(R().subarray(r,r+e))}const j=new TextEncoder;"encodeInto"in j||(j.encodeInto=function(r,e){const t=j.encode(r);return e.set(t),{read:r.length,written:t.length}});let a=0,o;function ne(r,e){return o=r.exports,F=null,B=null,T=null,o.__wbindgen_start(),o}function re(r){if(o!==void 0)return o;r!==void 0&&(Object.getPrototypeOf(r)===Object.prototype?{module:r}=r:console.warn("using deprecated parameters for `initSync()`; pass a single object instead"));const e=P();r instanceof WebAssembly.Module||(r=new WebAssembly.Module(r));const t=new WebAssembly.Instance(r,e);return ne(t)}function V(){let r=0;const e=new Map;return{add(t){const n=r++;return e.set(n,t),n},get(t){const n=e.get(t);if(!n)throw new Error("Attempted to use an object that has been freed");return n},remove(t){return e.delete(t)}}}const D=Symbol("transfer");function M(r,e){return{type:D,value:r,transfer:e?Array.isArray(e)?e:[e]:[r]}}function W(r){return!!(r&&typeof r=="object"&&Reflect.get(r,"type")===D)}function q(r="default"){return{createTx(e){const t=new Map,n=e??self;return n.addEventListener("message",_=>{const{data:c}=_;if(c.channelName!==r)return;const{id:s,result:i,error:u}=c,g=t.get(s);g&&(u?g.reject(u):g.resolve(i),t.delete(s))}),new Proxy({},{get(_,c){return(...s)=>{const i=_e(),u=[],g=[];return s.forEach(v=>{W(v)?(u.push(v.value),g.push(...v.transfer)):u.push(v)}),n.postMessage({method:c,args:u,id:i,channelName:r},{transfer:g}),new Promise((v,ae)=>{t.set(i,{resolve:v,reject:ae})})}}})},rx(e,t){const n=t??self;n.addEventListener("message",async _=>{const{data:c}=_;if(c.channelName!==r)return;const{method:s,args:i,id:u}=c;try{const g=await e[s](...i);W(g)?n.postMessage({result:g.value,id:u,channelName:r},{transfer:g.transfer}):n.postMessage({result:g,id:u,channelName:r})}catch(g){n.postMessage({error:g,id:u,channelName:r})}})}}}function _e(){return new Array(4).fill(0).map(()=>Math.floor(Math.random()*Number.MAX_SAFE_INTEGER).toString(16)).join("-")}const{rx:oe}=q(),{createTx:ce}=q("worker");function se(r){if(!(r!=null&&r.manifests))return r;const e=r.manifests,t=Object.assign(Object.create(null),e),n=Object.getPrototypeOf(e);return n!==null&&n!==Object.prototype&&(t.__proto__=n),r.manifests=t,r}const h=V(),f=V(),k=ce();function C(r){return r.map(e=>({sigType:e.sigType,reserveSize:e.reserveSize,referencedAssertions:e.referencedAssertions,roles:e.roles,sign:async t=>{const n=t.referencedAssertions.map(c=>c.hash.buffer);return await k.cawgSign(e.requestId,M(t,n))}}))}oe(ie({async initWorker(r){re({module:r})},async reader_fromBlob(r,e,t){const n=await I.fromBlob(r,e,t);return h.add(n)},async reader_fromBlobFragment(r,e,t,n){const _=await I.fromBlobFragment(r,e,t,n);return h.add(_)},reader_activeLabel(r){return h.get(r).activeLabel()??null},reader_manifestStore(r){const e=h.get(r);return se(e.manifestStore())},reader_activeManifest(r){return h.get(r).activeManifest()},reader_json(r){return h.get(r).json()},reader_crJson(r){return h.get(r).crJson()},reader_resourceToBytes(r,e){const n=h.get(r).resourceToBytes(e);return M(n,n.buffer)},reader_free(r){h.get(r).free(),h.remove(r)},builder_new(r){const e=p.new(r);return f.add(e)},builder_fromJson(r,e){const t=p.fromJson(r,e);return f.add(t)},builder_fromArchive(r,e){const t=p.fromArchive(r,e);return f.add(t)},builder_setIntent(r,e){f.get(r).setIntent(e)},builder_addAction(r,e){f.get(r).addAction(e)},builder_addAssertion(r,e,t){f.get(r).addAssertion(e,t)},builder_addRedaction(r,e,t){f.get(r).addRedaction(e,t)},builder_filterActionsAt(r,e){f.get(r).filterActionsAt(Uint32Array.from(e))},builder_updateActionsAt(r,e){f.get(r).updateActionsAt(e)},builder_filterIngredientsAt(r,e){f.get(r).filterIngredientsAt(Uint32Array.from(e))},builder_filterActionsAndIngredientsAt(r,e,t){f.get(r).filterActionsAndIngredientsAt(Uint32Array.from(e),Uint32Array.from(t))},builder_setRemoteUrl(r,e){f.get(r).setRemoteUrl(e)},builder_setNoEmbed(r,e){f.get(r).setNoEmbed(e)},builder_setThumbnailFromBlob(r,e,t){f.get(r).setThumbnailFromBlob(e,t)},builder_addIngredient(r,e){f.get(r).addIngredient(e)},async builder_addIngredientFromBlob(r,e,t,n){await f.get(r).addIngredientFromBlob(e,t,n)},builder_addResourceFromBlob(r,e,t){f.get(r).addResourceFromBlob(e,t)},builder_getDefinition(r){return f.get(r).getDefinition()},builder_toArchive(r){const t=f.get(r).toArchive();return M(t,t.buffer)},async builder_sign(r,e,t,n,_,c){const i=await f.get(r).sign({reserveSize:t.reserveSize,alg:t.alg,sign:async u=>await k.sign(e,M(u,u.buffer),t.reserveSize)},C(n),_,c);return M(i,i.buffer)},async builder_signAndGetManifestBytes(r,e,t,n,_,c){const s=f.get(r),{manifest:i,asset:u}=await s.signAndGetManifestBytes({reserveSize:t.reserveSize,alg:t.alg,sign:async g=>await k.sign(e,M(g,g.buffer),t.reserveSize)},C(n),_,c);return M({manifest:i,asset:u},[i.buffer,u.buffer])},builder_free(r){f.get(r).free(),f.remove(r)}}));function ie(r){const e={};for(const[t,n]of Object.entries(r))e[t]=async(..._)=>{try{return await n(..._)}catch(c){throw typeof c=="string"?new Error(c):c}};return e}})();\n';
var W = typeof self < "u" && self.Blob && new Blob([K], { type: "text/javascript;charset=utf-8" });
function oe(n) {
  let e;
  try {
    if (e = W && (self.URL || self.webkitURL).createObjectURL(W), !e) throw "";
    const t = new Worker(e, {
      name: n == null ? void 0 : n.name
    });
    return t.addEventListener("error", () => {
      (self.URL || self.webkitURL).revokeObjectURL(e);
    }), t;
  } catch {
    return new Worker(
      "data:text/javascript;charset=utf-8," + encodeURIComponent(K),
      {
        name: n == null ? void 0 : n.name
      }
    );
  } finally {
    e && (self.URL || self.webkitURL).revokeObjectURL(e);
  }
}
function _e(n) {
  if (n.protocol !== "https:")
    throw new Error(
      `Worker source URL must use https, but got ${n.protocol}`
    );
  return n.toString();
}
async function ae(n) {
  const { wasm: e, workerSrc: t } = n;
  let r = 0;
  const o = t ? new Worker(_e(t), { type: "module" }) : new oe(), s = ie(o), _ = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
  se(
    {
      sign: async (l2, d, b) => {
        const g2 = _.get(l2);
        if (_.delete(l2), !g2)
          throw new Error("No signer registered for request");
        const p2 = await g2(d, b);
        return M(p2, p2.buffer);
      },
      // Reverse-RPC handler for a CAWG credential holder's `sign`, mirroring
      // `sign` above: the callback was registered on the main thread by
      // `Builder.sign`/`signAndGetManifestBytes` (see
      // `registerCredentialHolderReceiver`) and is looked up and run here,
      // never inside the worker.
      cawgSign: async (l2, d) => {
        const b = a.get(l2);
        if (a.delete(l2), !b)
          throw new Error("No credential holder registered for request");
        const g2 = await b(d);
        return M(g2, g2.buffer);
      }
    },
    o
  );
  function u(l2) {
    const d = r++;
    return _.set(d, l2), d;
  }
  function w(l2) {
    const d = r++;
    return a.set(d, l2), d;
  }
  return await s.initWorker(e), {
    tx: s,
    registerSignReceiver: u,
    registerCredentialHolderReceiver: w,
    terminate: () => o.terminate()
  };
}
typeof FinalizationRegistry > "u" || new FinalizationRegistry((n) => j.__wbg_wasmbuilder_free(n, 1));
typeof FinalizationRegistry > "u" || new FinalizationRegistry((n) => j.__wbg_wasmreader_free(n, 1));
typeof FinalizationRegistry > "u" || new FinalizationRegistry((n) => j.__wbg_wasmsigner_free(n, 1));
typeof FinalizationRegistry > "u" || new FinalizationRegistry((n) => j.__wbindgen_destroy_closure(n.a, n.b));
var ce = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
ce.decode();
var N = new TextEncoder();
"encodeInto" in N || (N.encodeInto = function(n, e) {
  const t = N.encode(n);
  return e.set(t), {
    read: n.length,
    written: t.length
  };
});
var j;
var ue = "sha512-dy+y/WRGgJP0600LxgBD8aQ6GKZr631fVXf06RNemy3HRyKkx6vVvx1BQvUgqr4f5DjumkBRO6QOttSv9NwwWA==";
var F = (n) => {
  if (typeof n == "object" && n !== null) {
    if (typeof Object.getPrototypeOf == "function") {
      const e = Object.getPrototypeOf(n);
      return e === Object.prototype || e === null;
    }
    return Object.prototype.toString.call(n) === "[object Object]";
  }
  return false;
};
var fe = /* @__PURE__ */ new Set([
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
var m = (...n) => n.reduce((e, t) => {
  if (t === void 0)
    return e;
  if (Array.isArray(t))
    throw new TypeError("Arguments provided to ts-deepmerge must be objects, not arrays.");
  return Object.keys(t).forEach((r) => {
    fe.has(r) || (Array.isArray(e[r]) && Array.isArray(t[r]) ? e[r] = m.options.mergeArrays ? m.options.uniqueArrayItems ? Array.from(new Set(e[r].concat(t[r]))) : [...e[r], ...t[r]] : t[r] : F(e[r]) && F(t[r]) ? e[r] = m(e[r], t[r]) : !F(e[r]) && F(t[r]) ? e[r] = m(t[r], void 0) : e[r] = t[r] === void 0 ? m.options.allowUndefinedOverrides ? t[r] : e[r] : t[r]);
  }), e;
}, {});
var D = {
  allowUndefinedOverrides: true,
  mergeArrays: true,
  uniqueArrayItems: true
};
m.options = D;
m.withOptions = (n, ...e) => {
  m.options = Object.assign(Object.assign({}, D), n);
  const t = m(...e);
  return m.options = D, t;
};
var de = 1 * 1024 * 1024;
var le = 2;
var be = 200;
var ge = 2e3;
var we = 3e4;
function me(n) {
  return n === 429 || n >= 500;
}
function he(n) {
  return n instanceof Error && n.name === "AbortError";
}
function ye(n, e, t) {
  const r = Math.min(e * 2 ** n, t), o = Math.floor(Math.random() * 200);
  return Math.min(r + o, t);
}
function Ae(n) {
  if (!n)
    return null;
  const e = Number(n);
  if (!Number.isNaN(e))
    return e * 1e3;
  const t = Date.parse(n);
  return Number.isNaN(t) ? null : t - Date.now();
}
function pe(n) {
  try {
    new URL(n);
  } catch {
    throw new Error(`Invalid URL: ${n}`);
  }
}
async function Z(n, e, t) {
  pe(n);
  const r = (t == null ? void 0 : t.maxRetries) ?? le, o = (t == null ? void 0 : t.initialRetryDelayMs) ?? be, s = (t == null ? void 0 : t.maxRetryDelayMs) ?? ge, _ = (t == null ? void 0 : t.maxRetryAfterMs) ?? we, a = (t == null ? void 0 : t.isRetryableStatus) ?? me, u = (t == null ? void 0 : t.isRetryableError) ?? (() => true), w = (t == null ? void 0 : t.fetch) ?? fetch, l2 = (d) => ye(d, o, s);
  for (let d = 0; ; d++) {
    let b;
    try {
      b = await w(n, e);
    } catch (g2) {
      if (!he(g2) && u(g2) && d < r) {
        await new Promise((R) => setTimeout(R, l2(d)));
        continue;
      }
      const p2 = g2 instanceof Error ? g2.message : String(g2);
      throw new Error(`Network error fetching ${n}: ${p2}`, {
        cause: g2
      });
    }
    if (!b.ok) {
      if (a(b.status)) {
        const p2 = Ae(b.headers.get("retry-after"));
        if (p2 !== null) {
          if (p2 > _)
            throw new Error(`Failed to fetch ${n}: server requested a Retry-After delay of ${Math.ceil(p2 / 1e3)}s, which exceeds the maximum allowed delay of ${_ / 1e3}s`);
          if (d < r) {
            await new Promise((R) => setTimeout(R, Math.max(p2, 0)));
            continue;
          }
          throw new Error(`Failed to fetch ${n}: ${b.status} ${b.statusText}`);
        }
        if (d < r) {
          await new Promise((R) => setTimeout(R, l2(d)));
          continue;
        }
      }
      throw new Error(`Failed to fetch ${n}: ${b.status} ${b.statusText}`);
    }
    return b;
  }
}
async function C(n, e) {
  const t = (e == null ? void 0 : e.maxResponseBytes) ?? de, r = await Z(n, void 0, e), o = r.headers.get("content-length");
  if (o !== null && Number(o) > t)
    throw new Error(`Response from ${n} is too large. Max size is ${t} bytes.`);
  const s = await r.text();
  if (s.length > t)
    throw new Error(`Response from ${n} is too large. Max size is ${t} bytes.`);
  return s;
}
function J(n) {
  return Object.entries(n).reduce((t, [r, o]) => (t[Re(r)] = Q(o), t), {});
}
function Q(n) {
  return Array.isArray(n) ? n.map(Q) : typeof n == "object" && n !== null ? J(n) : n;
}
function Re(n) {
  return n.replace(/[A-Z]/g, (e) => `_${e.toLowerCase()}`);
}
var ve = Object.freeze({
  builder: Object.freeze({
    generateC2paArchive: true
  })
});
function Se(n) {
  return m(ve, n ?? {});
}
async function xe(n, e) {
  const t = Se(n), r = [];
  return t.trust && r.push(q(t.trust, e)), t.cawgTrust && r.push(q(t.cawgTrust, e)), await Promise.all(r), JSON.stringify(J(t));
}
function ze(n) {
  return { trust: { ...n } };
}
function De(n) {
  return { cawgTrust: { ...n } };
}
function Je(n) {
  return { verify: { ...n } };
}
function x(...n) {
  return m(...n);
}
function $e(n) {
  return JSON.stringify(J(n));
}
async function ke(n, e) {
  return await (await Z(n, void 0, e)).text();
}
var Ee = [
  "userAnchors",
  "trustAnchors",
  "trustConfig",
  "allowedList"
];
async function q(n, e) {
  const t = (s) => ["userAnchors", "trustAnchors"].includes(s), r = (s) => s.includes("-----BEGIN CERTIFICATE-----"), o = (s) => s.startsWith("http");
  try {
    const s = Object.entries(n).filter(([_]) => Ee.includes(_)).map(async ([_, a]) => {
      if (a && typeof a == "object" && Array.isArray(a)) {
        const u = a.map(async (d) => {
          if (typeof d != "string")
            throw new Error("Expected a string value for array item");
          const b = await C(d, e);
          if (t(_) && !r(b))
            throw new Error(`Error parsing PEM file at: ${d}`);
          return b;
        }), l2 = (await Promise.all(u)).join("");
        n[_] = l2;
      } else if (a && typeof a == "string" && o(a)) {
        const u = await C(a, e);
        if (t(_) && !r(u))
          throw new Error(`Error parsing PEM file at: ${a}`);
        n[_] = u;
      } else
        return a;
    });
    await Promise.all(s);
  } catch (s) {
    const _ = s instanceof Error ? s.message : String(s);
    throw new Error(`Failed to resolve trust settings. ${_}`, {
      cause: s
    });
  }
}
var A = class {
  constructor(e) {
    O(this, "_settings");
    O(this, "_jsonPromise");
    this._settings = e;
  }
  /**
   * The settings currently attached to this `Context`, if any.
   *
   * To derive a new `Context` with different settings, construct one with `new Context(settings)`.
   * To combine this `Context`'s settings with more settings, merge them with {@link mergeSettings}
   * first and pass the single, merged result to the constructor.
   */
  get settings() {
    return this._settings;
  }
  /**
   * Resolves this `Context`'s settings (fetching any embedded trust-anchor URLs) and serializes
   * the result for consumption by the WASM/native boundary. A successful result is memoized, so
   * resolution of this Context's settings only happens once. If different fetch-with-retry
   * options need to be provided, callers should create a separate `Context` and then call
   * `toJson()` with the desired options.
   *
   * A failed resolution is not memoized: the next call to `toJson()` tries again from scratch,
   * so a transient failure (e.g. a network error while fetching a trust-anchor URL) doesn't
   * permanently break this `Context`.
   *
   * @param options Optional configurations for fetch-with-retry, used when resolving trust-anchor
   * URLs. Only consulted on the first call, or the first call after a previous failure.
   * @returns A JSON-serialized string of the resolved settings.
   */
  toJson(e) {
    return this._jsonPromise ?? (this._jsonPromise = xe(this.settings, e).catch((t) => {
      throw this._jsonPromise = void 0, t;
    })), this._jsonPromise;
  }
};
var Ie = 10 ** 9;
function ee(n) {
  return Number.isFinite(n) && n > 0 ? n : Ie;
}
var Fe = class extends Error {
  /**
   * @param sizeInBytes Size of the asset, in bytes.
   * @param maxSizeInBytes Maximum allowed size, in bytes. `0` (or any other
   * non-finite/negative value) resolves to {@link DEFAULT_MAX_SIZE_IN_BYTES}.
   */
  constructor(e, t) {
    const r = ee(t);
    super(`The provided asset was too large. Size: ${e} bytes. Maximum: ${r}.`), this.name = "AssetTooLargeError";
  }
};
function U(n, e) {
  if (!Number.isFinite(n) || n < 0)
    throw new RangeError(`sizeInBytes must be a finite, non-negative number. Received: ${n}.`);
  if (!Number.isFinite(e) || e < 0)
    throw new RangeError(`maxSizeInBytes must be a finite, non-negative number. Received: ${e}.`);
  const t = ee(e);
  if (n > t)
    throw new Fe(n, t);
}
var L = 10 ** 9;
var z = new FinalizationRegistry(
  async ({ worker: n, id: e }) => {
    await n.tx.reader_free(e);
  }
);
var h2;
var y;
var B = class B2 {
  constructor(e, t) {
    v(this, h2);
    v(this, y);
    S(this, h2, e), S(this, y, t);
  }
  /**
   * Create a {@link Reader} from an asset's format and a blob of its bytes.
   *
   * @param c2pa The `C2pa` instance (from {@link createC2pa}) to create this reader on.
   * @param format Asset format.
   * @param blob Blob of asset bytes.
   * @param context Optional `Context` configuring this reader's behavior.
   * @returns A {@link Reader} object or null if no C2PA metadata was found.
   * @throws If the asset is too large.
   */
  static async fromBlob(e, t, r, o = new A()) {
    U(r.size, L);
    try {
      const s = await o.toJson(), { worker: _ } = e, a = await _.tx.reader_fromBlob(t, r, s), u = new B2(_, a);
      return z.register(u, { worker: _, id: a }, u), u;
    } catch (s) {
      return V(s);
    }
  }
  /**
   * Create a {@link Reader} from an initial fragment and a subsequent fragment.
   *
   * @param c2pa The `C2pa` instance (from {@link createC2pa}) to create this reader on.
   * @param format Asset format.
   * @param init Blob of initial fragment bytes.
   * @param fragment Blob of fragment bytes.
   * @param context Optional `Context` configuring this reader's behavior.
   * @returns A {@link Reader} object or null if no C2PA metadata was found.
   * @throws If the asset is too large.
   */
  static async fromBlobFragment(e, t, r, o, s = new A()) {
    U(r.size, L), U(o.size, L);
    try {
      const _ = await s.toJson(), { worker: a } = e, u = await a.tx.reader_fromBlobFragment(
        t,
        r,
        o,
        _
      ), w = new B2(a, u);
      return z.register(w, { worker: a, id: u }, w), w;
    } catch (_) {
      return V(_);
    }
  }
  /**
   * @returns The label of the active manifest.
   */
  async activeLabel() {
    return await i(this, h2).tx.reader_activeLabel(i(this, y));
  }
  /**
   * @returns The asset's full {@link ManifestStore} containing all its manifests, validation statuses, and the URI of the active manifest.
   */
  async manifestStore() {
    return await i(this, h2).tx.reader_manifestStore(i(this, y));
  }
  /**
   * @returns The asset's active {@link Manifest}.
   */
  async activeManifest() {
    return await i(this, h2).tx.reader_activeManifest(i(this, y));
  }
  /**
   * @returns The asset's full {@link ManifestStore}.
   *
   * @deprecated Use {@link manifestStore} instead.
   */
  async json() {
    const e = await i(this, h2).tx.reader_json(i(this, y));
    return JSON.parse(e);
  }
  /**
   * @returns The asset's manifest store as crJSON.
   */
  async crJson() {
    const e = await i(this, h2).tx.reader_crJson(i(this, y));
    return JSON.parse(e);
  }
  /**
   * Resolves a URI reference to a binary object (e.g. a thumbnail) in the resource store.
   *
   * @param uri URI of the binary object to resolve.
   * @returns A Uint8Array of the resource's bytes.
   *
   * @example Retrieving a thumbnail from the resource store:
   * ```
   * const reader = await Reader.fromBlob(c2pa, blob.type, blob);
   * const activeManifest = await reader.activeManifest();
   * const thumbnailBuffer = await reader.resourceToBytes(activeManifest.thumbnail!.identifier);
   * ```
   */
  async resourceToBytes(e) {
    return await i(this, h2).tx.reader_resourceToBytes(i(this, y), e);
  }
  /**
   * Dispose of this Reader, freeing the memory it occupied and preventing further use.
   * Call this whenever the Reader is no longer needed.
   */
  async free() {
    z.unregister(this), await i(this, h2).tx.reader_free(i(this, y));
  }
};
h2 = /* @__PURE__ */ new WeakMap(), y = /* @__PURE__ */ new WeakMap();
var M2 = B;
function Te(n, e = {}) {
  return {
    fromBlob: (t, r, o = {}) => M2.fromBlob(
      n,
      t,
      r,
      new A(x(e, o))
    ),
    fromBlobFragment: (t, r, o, s = {}) => M2.fromBlobFragment(
      n,
      t,
      r,
      o,
      new A(x(e, s))
    )
  };
}
function V(n) {
  if (n instanceof Error && n.message === "C2pa(JumbfNotFound)")
    return null;
  throw n;
}
async function G(n) {
  const { alg: e } = n;
  return {
    reserveSize: await n.reserveSize(),
    alg: e
  };
}
function Me(n, e) {
  const { credentialHolder: t, referencedAssertions: r, roles: o } = n;
  return {
    requestId: e,
    sigType: t.sigType,
    reserveSize: t.reserveSize,
    referencedAssertions: r ?? [],
    roles: o ?? []
  };
}
function Y(n) {
  return te(n).flat();
}
function te(n) {
  return (n.assertions ?? []).filter((e) => e.label.startsWith("c2pa.actions")).map((e) => {
    const t = e.data;
    return (t == null ? void 0 : t.actions) ?? [];
  });
}
function H(n, e) {
  const t = (e == null ? void 0 : e.identityAssertions) ?? [];
  if (t.length > 1)
    throw new Error(
      "Only one identity assertion is currently supported per signing operation."
    );
  return t.map((r) => {
    const o = n.registerCredentialHolderReceiver(
      r.credentialHolder.sign
    );
    return Me(r, o);
  });
}
var T = new FinalizationRegistry(
  ({ worker: n, id: e }) => {
    n.tx.builder_free(e);
  }
);
var c;
var f;
var I = class I2 {
  constructor(e, t) {
    v(this, c);
    v(this, f);
    S(this, c, e), S(this, f, t);
  }
  /**
   * Create a {@link Builder} with a minimal manifest definition as its initial state.
   *
   * @param c2pa The `C2pa` instance (from {@link createC2pa}) to create this builder on.
   * @param context Optional `Context` configuring this builder's behavior.
   * @returns A {@link Builder} object.
   */
  static async new(e, t = new A()) {
    const r = await t.toJson(), { worker: o } = e, s = await o.tx.builder_new(r), _ = new I2(o, s);
    return T.register(_, { worker: o, id: s }, _), _;
  }
  /**
   * Create a {@link Builder} from a {@link ManifestDefinition}.
   *
   * @param c2pa The `C2pa` instance (from {@link createC2pa}) to create this builder on.
   * @param definition The {@link ManifestDefinition} to be used as the builder's initial state.
   * @param context Optional `Context` configuring this builder's behavior.
   * @returns A {@link Builder} object.
   */
  static async fromDefinition(e, t, r = new A()) {
    const o = JSON.stringify(t), s = await r.toJson(), { worker: _ } = e, a = await _.tx.builder_fromJson(o, s), u = new I2(_, a);
    return T.register(u, { worker: _, id: a }, u), u;
  }
  /**
   * Create a {@link Builder} from a builder archive (created from {@link Builder.toArchive}).
   *
   * @param c2pa The `C2pa` instance (from {@link createC2pa}) to create this builder on.
   * @param archive Builder archive as a blob.
   * @param context Optional `Context` configuring this builder's behavior.
   * @returns A {@link Builder} object.
   */
  static async fromArchive(e, t, r = new A()) {
    const o = await r.toJson(), { worker: s } = e, _ = await s.tx.builder_fromArchive(t, o), a = new I2(s, _);
    return T.register(a, { worker: s, id: _ }, a), a;
  }
  /**
   * Sets the builder "intent."
   *
   * @todo Additional documentation coming soon.
   *
   * @param intent
   */
  async setIntent(e) {
    await i(this, c).tx.builder_setIntent(i(this, f), e);
  }
  /**
   * Add an action to the manifest's actions assertion.
   *
   * @param action Object representing the action to be added.
   */
  async addAction(e) {
    await i(this, c).tx.builder_addAction(i(this, f), e);
  }
  /**
   * Add an assertion to the manifest under the given label.
   *
   * @param label The assertion label (reverse-domain format).
   * @param data The assertion data (any JSON-serializable value).
   */
  async addAssertion(e, t) {
    await i(this, c).tx.builder_addAssertion(i(this, f), e, t);
  }
  /**
   * Redact an assertion from an ingredient manifest.
   *
   * Adds the URI to the builder's redaction list and appends a `c2pa.redacted` action
   * with the given reason, as required by the C2PA spec.
   *
   * @param uri JUMBF URI of the assertion to redact.
   * @param reason The {@link C2paReason} for the redaction.
   */
  async addRedaction(e, t) {
    await i(this, c).tx.builder_addRedaction(i(this, f), e, t);
  }
  /**
   * Sets the remote URL for a remote manifest. The manifest is expected to be available at this location.
   *
   * @param url URL pointing to the location the remote manifest will be stored.
   */
  async setRemoteUrl(e) {
    await i(this, c).tx.builder_setRemoteUrl(i(this, f), e);
  }
  /**
   * Sets the state of the no_embed flag.
   * To skip embedding a manifest (e.g. for the remote-only case), set this to `true`.
   *
   * @param noEmbed Value to set the no_embed flag.
   */
  async setNoEmbed(e) {
    await i(this, c).tx.builder_setNoEmbed(i(this, f), e);
  }
  /**
   * Set a thumbnail from a blob to be included in the manifest. The blob should represent the asset being signed.
   *
   * @param format Format of the thumbnail
   * @param blob Blob of the thumbnail bytes
   */
  async setThumbnailFromBlob(e, t) {
    await i(this, c).tx.builder_setThumbnailFromBlob(i(this, f), e, t);
  }
  /**
   * Experimental.
   * Retains only the actions for which `keep` returns true.
   *
   * The inception action, `c2pa.created` or `c2pa.opened`, is always kept regardless of `keep`,
   * and is moved to index 0 if needed, so the manifest stays valid per the C2PA spec. Sets
   * `allActionsIncluded = false` when anything is removed. This does not touch ingredients.
   * Call {@link Builder.filterIngredients}, using `filterIngredients(() => false)` to drop all
   * orphans, afterwards if you also want to drop ingredients now orphaned by the removed
   * actions.
   *
   * Unlike the Node binding, Neon, which can invoke the JS predicate synchronously from Rust,
   * the WASM builder lives in a Web Worker. A predicate closure can't be called across the
   * worker boundary, so we evaluate it here on the main thread and send the resulting indices
   * to the worker, where WASM applies the equivalent index-based filter. The action/ingredient
   * ordering here must match what WASM iterates. See `filterActionsAt` and `filterIngredientsAt`.
   *
   * @param keep The action is retained when the predicate returns true.
   */
  async filterActions(e) {
    const t = await i(this, c).tx.builder_getDefinition(
      i(this, f)
    ), o = Y(t).reduce((s, _, a) => (e(_) && s.push(a), s), []);
    await i(this, c).tx.builder_filterActionsAt(i(this, f), o);
  }
  /**
   * Experimental.
   * Retains ingredients, then rewrites positional ingredient references so linked actions
   * stay valid.
   *
   * An ingredient is kept if it is referenced by a current action, is a `parentOf` ingredient,
   * or `rescue` returns true for it. `rescue` therefore only ever rescues an otherwise-orphaned
   * ingredient. It can never drop a referenced or lineage ingredient. Call
   * {@link Builder.filterActions} first if you are also removing actions: the keep-set is
   * computed from whatever actions currently remain.
   *
   * @param rescue Can rescue an otherwise-orphaned ingredient by returning true.
   */
  async filterIngredients(e) {
    const o = ((await i(this, c).tx.builder_getDefinition(
      i(this, f)
    )).ingredients ?? []).reduce((s, _, a) => (e(_) && s.push(a), s), []);
    await i(this, c).tx.builder_filterIngredientsAt(i(this, f), o);
  }
  /**
   * Experimental.
   * Retains actions and ingredients together in one step.
   *
   * `rescueIngredient` is evaluated for every ingredient first; any action referencing an
   * ingredient it would rescue is force-kept regardless of `keepAction`.
   *
   * @param keepAction The action is retained when the predicate returns true.
   * @param rescueIngredient Can rescue an otherwise-orphaned ingredient (and the action
   * referencing it) by returning true.
   */
  async filterActionsAndIngredients(e, t) {
    const r = await i(this, c).tx.builder_getDefinition(
      i(this, f)
    ), s = Y(r).reduce((u, w, l2) => (e(w) && u.push(l2), u), []), a = (r.ingredients ?? []).reduce(
      (u, w, l2) => (t(w) && u.push(l2), u),
      []
    );
    await i(this, c).tx.builder_filterActionsAndIngredientsAt(
      i(this, f),
      s,
      a
    );
  }
  /**
   * Replaces the actions in the `c2pa.actions`/`c2pa.actions.v2` assertions.
   *
   * A manifest can carry more than one actions assertion (the created-list and
   * gathered-list entries are distinct assertions). `transform` is therefore
   * invoked once per actions assertion, in positional order, with that
   * assertion's own actions.
   *
   * A no-op if there is no actions assertion. Use `addAction` for those.
   *
   * The returned list is written back as is.
   * `transform` can therefore produce an actions array that fails
   * validation at signing time, for example by removing the inception action
   * (`c2pa.created`/`c2pa.opened`) or moving it out of first position.
   *
   * @param transform Receives one assertion's actions and returns its full replacement list.
   */
  async updateActions(e) {
    const t = await i(this, c).tx.builder_getDefinition(
      i(this, f)
    ), o = te(t).map((s) => e(s));
    await i(this, c).tx.builder_updateActionsAt(i(this, f), o);
  }
  /**
   * Add an ingredient to the builder from a definition only.
   *
   * @param ingredientDefinition {@link Ingredient} definition.
   */
  async addIngredient(e) {
    const t = JSON.stringify(e);
    await i(this, c).tx.builder_addIngredient(i(this, f), t);
  }
  /**
   * Add an ingredient to the builder from a definition, format, and blob.
   * Values specified in the ingredient definition will be merged with the ingredient, and these values take precendence.
   *
   * @param ingredientDefinition {@link Ingredient} definition.
   * @param format Format of the ingredient.
   * @param blob Blob of the ingredient's bytes.
   */
  async addIngredientFromBlob(e, t, r) {
    const o = JSON.stringify(e);
    await i(this, c).tx.builder_addIngredientFromBlob(i(this, f), o, t, r);
  }
  /**
   * Add a resource to the builder's resource store with an ID and blob of the resource's bytes.
   *
   * @param resourceId ID associated with the resource being added.
   * @param blob Blob of the resource's bytes.
   */
  async addResourceFromBlob(e, t) {
    await i(this, c).tx.builder_addResourceFromBlob(i(this, f), e, t);
  }
  /**
   * Gets the current manifest definition held by the builder.
   *
   * @returns The {@link ManifestDefinition} held by the builder.
   */
  async getDefinition() {
    return await i(this, c).tx.builder_getDefinition(i(this, f));
  }
  /**
   * Save the builder into .c2pa format.
   * This "archive" can be added to as an ingredient with {@link addIngredientFromBlob}
   *
   * @returns A builder archive in application/c2pa format.
   */
  async toArchive() {
    return await i(this, c).tx.builder_toArchive(i(this, f));
  }
  /**
   * Sign an asset.
   *
   * @param signer The signer to use for the manifest's claim signature.
   * @param format The format (MIME type) of the asset.
   * @param blob The asset bytes.
   * @param options Optional {@link SignOptions}. `identityAssertions` attaches
   * one or more CAWG identity assertions (`cawg.identity`) to the manifest.
   *
   * @todo Docs coming soon
   */
  async sign(e, t, r, o) {
    const s = await G(e), _ = i(this, c).registerSignReceiver(e.sign), a = H(
      i(this, c),
      o
    );
    return await i(this, c).tx.builder_sign(
      i(this, f),
      _,
      s,
      a,
      t,
      r
    );
  }
  /**
   * Sign an asset and get both the signed asset bytes and the manifest bytes.
   *
   * @param signer The signer to use for the manifest's claim signature.
   * @param format The format (MIME type) of the asset.
   * @param blob The asset bytes.
   * @param options Optional {@link SignOptions}. `identityAssertions` attaches
   * one or more CAWG identity assertions (`cawg.identity`) to the manifest.
   *
   * @todo Docs coming soon
   */
  async signAndGetManifestBytes(e, t, r, o) {
    const s = await G(e), _ = i(this, c).registerSignReceiver(e.sign), a = H(
      i(this, c),
      o
    );
    return await i(this, c).tx.builder_signAndGetManifestBytes(
      i(this, f),
      _,
      s,
      a,
      t,
      r
    );
  }
  /**
   * Dispose of this Builder, freeing the memory it occupied and preventing further use. Call this whenever the Builder is no longer needed.
   */
  async free() {
    T.unregister(this), await i(this, c).tx.builder_free(i(this, f));
  }
};
c = /* @__PURE__ */ new WeakMap(), f = /* @__PURE__ */ new WeakMap();
var E = I;
function Be(n, e = {}) {
  return {
    new: (t = {}) => E.new(n, new A(x(e, t))),
    fromDefinition: (t, r = {}) => E.fromDefinition(
      n,
      t,
      new A(x(e, r))
    ),
    fromArchive: (t, r = {}) => E.fromArchive(
      n,
      t,
      new A(x(e, r))
    )
  };
}
async function Pe(n) {
  const { wasmSrc: e, workerSrc: t, settings: r } = n, o = typeof e == "string" ? await je(e) : e, s = await ae({ wasm: o, workerSrc: t }), _ = {
    worker: s,
    reader: void 0,
    builder: void 0,
    dispose: s.terminate
  };
  return _.reader = Te(_, r), _.builder = Be(_, r), _;
}
async function je(n) {
  const e = await fetch(n, { integrity: ue });
  return await WebAssembly.compileStreaming(e);
}
export {
  Fe as AssetTooLargeError,
  E as Builder,
  A as Context,
  be as DEFAULT_INITIAL_RETRY_DELAY_MS,
  de as DEFAULT_MAX_RESPONSE_BYTES,
  le as DEFAULT_MAX_RETRIES,
  we as DEFAULT_MAX_RETRY_AFTER_MS,
  ge as DEFAULT_MAX_RETRY_DELAY_MS,
  Ie as DEFAULT_MAX_SIZE_IN_BYTES,
  ve as DEFAULT_SETTINGS,
  M2 as Reader,
  Pe as createC2pa,
  De as createCawgTrustSettings,
  ze as createTrustSettings,
  Je as createVerifySettings,
  me as defaultIsRetryableStatus,
  C as fetchWithRetry,
  Z as fetchWithRetryRaw,
  ke as loadSettingsFromUrl,
  x as mergeSettings,
  xe as resolveSettings,
  q as resolveTrustSettings,
  $e as settingsToJson,
  J as snakeCaseify,
  U as validateAssetSize,
  Se as withDefaultSettings
};
