(function(__root__){ var $isBrowser = typeof window !== "undefined" && window.navigator;
__root__ = !$isBrowser ? module.exports : __root__;
var $fsbx = $isBrowser ? (window["__fsbx__"] = window["__fsbx__"] || {})
    : global["$fsbx"] = global["$fsbx"] || {};
if (!$isBrowser) {
    global["require"] = require;
}
var $packages = $fsbx.p = $fsbx.p || {};
var $events = $fsbx.e = $fsbx.e || {};
var $getNodeModuleName = function (name) {
    if (/^([@a-z].*)$/.test(name)) {
        if (name[0] === "@") {
            var s = name.split("/");
            var target = s.splice(2, s.length).join("/");
            return [s[0] + "/" + s[1], target || undefined];
        }
        return name.split(/\/(.+)?/);
    }
};
var $getDir = function (filePath) {
    return filePath.substring(0, filePath.lastIndexOf('/')) || "./";
};
var $pathJoin = function () {
    var string = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        string[_i - 0] = arguments[_i];
    }
    var parts = [];
    for (var i = 0, l = arguments.length; i < l; i++) {
        parts = parts.concat(arguments[i].split("/"));
    }
    var newParts = [];
    for (var i = 0, l = parts.length; i < l; i++) {
        var part = parts[i];
        if (!part || part === ".") {
            continue;
        }
        if (part === "..") {
            newParts.pop();
        }
        else {
            newParts.push(part);
        }
    }
    if (parts[0] === "") {
        newParts.unshift("");
    }
    return newParts.join("/") || (newParts.length ? "/" : ".");
};
var $ensureExtension = function (name) {
    var matched = name.match(/\.(\w{1,})$/);
    if (matched) {
        var ext = matched[1];
        if (!ext) {
            return name + ".js";
        }
        return name;
    }
    return name + ".js";
};
var $loadURL = function (url) {
    if ($isBrowser) {
        var d = document;
        var head = d.getElementsByTagName('head')[0];
        var target;
        if (/\.css$/.test(url)) {
            target = d.createElement('link');
            target.rel = 'stylesheet';
            target.type = 'text/css';
            target.href = url;
        }
        else {
            target = d.createElement('script');
            target.type = 'text/javascript';
            target.src = url;
            target.async = true;
        }
        head.insertBefore(target, head.firstChild);
    }
};
var $getRef = function (name, opts) {
    var basePath = opts.path || "./";
    var pkg_name = opts.pkg || "default";
    var nodeModule = $getNodeModuleName(name);
    if (nodeModule) {
        basePath = "./";
        pkg_name = nodeModule[0];
        if (opts.v && opts.v[pkg_name]) {
            pkg_name = pkg_name + "@" + opts.v[pkg_name];
        }
        name = nodeModule[1];
    }
    if (/^~/.test(name)) {
        name = name.slice(2, name.length);
        basePath = "./";
    }
    var pkg = $packages[pkg_name];
    if (!pkg) {
        if ($isBrowser) {
            throw "Package was not found \"" + pkg_name + "\"";
        }
        else {
            return {
                serverReference: require(pkg_name)
            };
        }
    }
    if (!name) {
        name = "./" + pkg.s.entry;
    }
    var filePath = $pathJoin(basePath, name);
    var validPath = $ensureExtension(filePath);
    var file = pkg.f[validPath];
    if (!file) {
        validPath = $pathJoin(filePath, "/", "index.js");
        file = pkg.f[validPath];
        if (!file) {
            validPath = filePath + ".js";
            file = pkg.f[validPath];
        }
    }
    return {
        file: file,
        pkgName: pkg_name,
        versions: pkg.v,
        filePath: filePath,
        validPath: validPath
    };
};
var $trigger = function (name, args) {
    var e = $events[name];
    if (e) {
        for (var i in e) {
            e[i].apply(null, args);
        }
        ;
    }
};
var $import = function (name, opts) {
    if (opts === void 0) { opts = {}; }
    if (/^(http(s)?:|\/\/)/.test(name)) {
        return $loadURL(name);
    }
    var ref = $getRef(name, opts);
    if (ref.serverReference) {
        return ref.serverReference;
    }
    var file = ref.file;
    if (!file) {
        throw "File not found " + ref.validPath;
    }
    var validPath = ref.validPath;
    var pkgName = ref.pkgName;
    if (file.locals && file.locals.module) {
        return file.locals.module.exports;
    }
    var locals = file.locals = {};
    var __filename = name;
    var __dirname = $getDir(validPath);
    locals.exports = {};
    locals.module = { exports: locals.exports };
    locals.require = function (name) {
        return $import(name, { pkg: pkgName, path: __dirname, v: ref.versions });
    };
    var args = [locals.module.exports, locals.require, locals.module, validPath, __dirname, pkgName];
    $trigger("before-import", args);
    file.fn.apply(0, args);
    $trigger("after-import", args);
    return locals.module.exports;
};
var FuseBox = (function () {
    function FuseBox() {
    }
    Object.defineProperty(FuseBox, "isBrowser", {
        get: function () {
            return $isBrowser !== undefined;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FuseBox, "isServer", {
        get: function () {
            return !$isBrowser;
        },
        enumerable: true,
        configurable: true
    });
    FuseBox.import = function (name, opts) {
        return $import(name, opts);
    };
    FuseBox.on = function (name, fn) {
        $events[name] = $events[name] || [];
        $events[name].push(fn);
    };
    FuseBox.exists = function (path) {
        var ref = $getRef(path, {});
        return ref.file !== undefined;
    };
    FuseBox.expose = function (obj) {
        for (var key in obj) {
            var data = obj[key];
            var exposed = void 0;
            if (data.entry) {
                exposed = $import("./" + data.entry);
            }
            else {
                exposed = $import(data.pkg);
            }
            __root__[data.alias] = exposed;
        }
    };
    FuseBox.dynamic = function (path, str) {
        this.pkg("default", {}, function (___scope___) {
            ___scope___.file(path, function (exports, require, module, __filename, __dirname) {
                var res = new Function('exports', 'require', 'module', '__filename', '__dirname', '__root__', str);
                res(exports, require, module, __filename, __dirname, __root__);
            });
        });
    };
    FuseBox.pkg = function (pkg_name, versions, fn) {
        if ($packages[pkg_name]) {
            return fn($packages[pkg_name].s);
        }
        var pkg = $packages[pkg_name] = {};
        var _files = pkg.f = {};
        pkg.v = versions;
        var _scope = pkg.s = {
            file: function (name, fn) { _files[name] = { fn: fn }; },
        };
        return fn(_scope);
    };
    return FuseBox;
}());
 
return __root__["FuseBox"] = FuseBox; } )(this)