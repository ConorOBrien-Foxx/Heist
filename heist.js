class TokenEmitEvent extends Event {
	constructor(token, options) {
    	super("token", options);
        this.token = token;
    }
}
class DebugEmitEvent extends Event {
	constructor(debug, options) {
    	super("debug", options);
        this.debug = debug || 'var stacks = stacks ?? {}; var stringify = obj => Array.isArray(obj) ? `[${obj.map(stringify).join(", ")}]` : typeof obj === "object" ? `{${Object.entries(obj).map(([key, value]) => `${key}:${stringify(value)}`).join(", ")}}` : obj?.toString() ?? `${obj}`; Object.entries({ data: stacks.d, left: stacks.l, right: stacks.r, ops: stacks.o, exec_restore: stacks.e, history, }).map(([key, value]) => key + ": " + stringify(value ?? [])).join("\\n");\n';
    }
}
class OutputEmitter extends EventTarget {
    emitToken(token) {
        this.dispatchEvent(new TokenEmitEvent(token));
    }
    emitDebug(debug) {
        this.dispatchEvent(new DebugEmitEvent(debug));
    }
}

window.addEventListener("load", function () {
	const input = document.getElementById("input");
	const output = document.getElementById("output");
	const effect = document.getElementById("effect");
	const debug = document.getElementById("debug");
    const keyHistory = document.getElementById("key-history");
    const resetButton = document.getElementById("reset");
    const autoExecuteToggle = document.getElementById("auto-execute-toggle");
    const autoExecuteContent = document.getElementById("auto-execute-content");
    const focusNote = document.getElementById("focus-note");
    
    const resetState = () => {
        input.value = output.value = effect.value = debug.value = "";
        while(keyHistory.firstChild) {
            keyHistory.removeChild(keyHistory.firstChild);
        }
        input.focus();
    };
    resetState();
    
    input.addEventListener("blur", function () {
        focusNote.classList.remove("hidden");
    });
    input.addEventListener("focus", function () {
        focusNote.classList.add("hidden");
    });
    
    
    const toggleAutoExecution = () => {
        if(autoExecuteContent.classList.toggle("minimized")) {
            autoExecuteToggle.textContent = "Enable Autoexecution";
            effect.value = debug.value = "";
        }
        else {
            autoExecuteToggle.textContent = "Disable Autoexecution";
            // kind of hacky.
            emitter.emitToken("");
            emitter.emitDebug();
        }
    };
    autoExecuteToggle.addEventListener("click", toggleAutoExecution);
    
    const emitter = new OutputEmitter();
    emitter.addEventListener("token", function (ev) {
    	output.value += ev.token;
        if(autoExecuteContent.classList.contains("minimized")) {
            return;
        }
        try {
	        effect.value = eval(output.value);
        }
        catch(err) {
            effect.value = `Error while executing:\n${err}\n${err.stack}`;
        }
    });
    emitter.addEventListener("debug", function (ev) {
        if(autoExecuteContent.classList.contains("minimized")) {
            return;
        }
        try {
	        debug.value = eval(output.value + ev.debug);
        }
        catch(err) {
            debug.value = `Error while debugging:\n${err}\n${err.stack}`;
        }
    });
    
    resetButton.addEventListener("click", resetState);
    
    const addBoilerplate = (target, history, str) => `var history = history ?? [], stacks = stacks ?? {}, result; stacks['${target}'] ??= []; history.push('${history}'); ${str.endsWith(";") ? str : str + ";"} result;\n`;
    // behold: the heist compiler.
    input.addEventListener("keydown", function (ev) {
    	// feedback
        input.value = ev.key;
        const kbd = document.createElement("kbd");
        kbd.textContent = ev.key;
        keyHistory.appendChild(kbd);
        keyHistory.scrollTop = keyHistory.scrollHeight;
        // output emission
        if(ev.key == parseInt(ev.key)) {
            // set data
            emitter.emitToken(addBoilerplate('d', 'd', `stacks.d.push(result = ${ev.key});`));
        }
        else if(ev.key === "l") {
        	// store left
            emitter.emitToken(addBoilerplate('l', 'l', `stacks.l.push(result = stacks.d?.at(-1));`));
        }
        else if(ev.key === "r") {
        	// store right
            emitter.emitToken(addBoilerplate('r', 'r', `stacks.r.push(result = stacks.d?.at(-1));`));
        }
        else if(ev.key === "a" || ev.key === "+") {
        	// add
            emitter.emitToken(addBoilerplate('o', 'o', `stacks.o.push(result = (a, b) => a + b);`));
        }
        else if(ev.key === "s" || ev.key === "-") {
        	// subtract
            emitter.emitToken(addBoilerplate('o', 'o', `stacks.o.push(result = (a, b) => a - b);`));
        }
        else if(ev.key === "m" || ev.key === "*") {
        	// multiply
            emitter.emitToken(addBoilerplate('o', 'o', `stacks.o.push(result = (a, b) => a * b);`));
        }
        else if(ev.key === "d" || ev.key === "/") {
        	// divide
            emitter.emitToken(addBoilerplate('o', 'o', `stacks.o.push(result = (a, b) => a / b);`));
        }
        else if(ev.key === ";") {
            // execute
            emitter.emitToken(addBoilerplate('e', 'de', `if(stacks.l && stacks.l.length && stacks.r && stacks.r.length) { var l = stacks.l.pop(), r = stacks.r.pop(), o = stacks.o.pop();\nstacks.e.push({ l, r, o }); stacks.d.push(result = o(l, r)); }\nelse { stacks.e.push({}); stacks.d.push(undefined);}`));
        }
        else if(ev.key === "Backspace") {
            // undo!
            emitter.emitToken(`var history = history ?? []; toUndo = history.pop() ?? ""; [...toUndo].forEach(undo => "dlro".includes(undo) ? stacks[undo].pop() : undo === "e" ? Object.entries(stacks.e.pop()).forEach(([k, v]) => stacks[k].push(v)) : console.warn('cannot undo', undo)); result = true;`);
        }
        else {
            // unrecognized keypress
            kbd.classList.toggle("unrecognized");
        }
        
        emitter.emitDebug();
    });
});
