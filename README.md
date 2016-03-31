# jQueryProcess
Improved jQuery Deferred that will always remember scope given into the promise and call the listeners so that they share the ```this``` variable.
As a bonus, it can supply replacement for ```$.ajax()``` return value derived from Deferred and allows to simulate successful or failed Ajax request.

Passing promises in original ```$.Deferred```:

```JavaScript
	scope = {value: 'Me'};

	defer1 = $.Deferred(); //shouldn't I use the 'new' keyword?!?
	defer2 = $.Deferred();
	promise = defer2.promise(scope); //must keep promise for later use

	promise.done(function() {
		alert('value', this.value);
	});

	defer1.done(defer2.resolve.bind(promise));
		//must bind to promise to keep scope of the callback
	defer1.fail(function() {
		defer2.rejectWith(promise);
		//must use Closure to call callback in correct scope
	};

	defer1.resolve(); //will alert 'Me'
```

Keeping scope with ```$.Process```:

```JavaScript
	scope = {value: 'Me'};

	process1 = $.ProcessFactory(); //use as a Factory
	process2 = new $.Process();    //or classic 'new Class()'

	process2
		.promise(scope) //register scope for callbacks
		.done(function() {
			alert(this.value);
		})
	;

	process1.done(process2.resolve); //simply assign resolve as the callback
	process1.fail(process2.reject);  //and the same go for reject and notify

	process1.resolve(); //will alert 'Me'
```

Differences:

* ```$.Process``` has correct OOP naming of methods:
  *  create new instance of Process with ```new $.Process()```
  *  use Factory to get instance of Process with ```$.ProcessFactory()```
  *  you can use ```instanceof``` of the created Process object
    * note: Promise is always the provided object or basis Object if no source given - to use ```instanceof``` provide an object of required type to ```Process.promise()``` method
  * ```$.Deferred``` seems to be class by its name but in fact it's a factory that creates untyped object based on basic Object class
* simply calling ```Process.promise()``` with an object will remember this object and provide it as scope for all ```done()```, ```fail()``` and ```progress()``` callbacks
  * note: every time a ```done()``` or ```fail()``` method is mentioned, it also apply to ```always()``` method, which register callback for both ```done()``` and ```fail()``` events
* you can use Process' ```resolve()```, ```reject()``` and ```notify()``` methods as callbacks for another Process, Deferred or any method that expect a callback
  * for ```$.Deferred``` you have to create own Closure by ```bind()``` or a function
* To support deprecated methods of jQuery (```success()```, ```error()``` and ```then()```) you can use ```Process.ajax()``` instead of ```Process.promise()``` which will create a jqXHR promise which is better suitable for Process' methods ```resolveAjax()``` and ```rejectAjax()``` which emulate behavior of ```$.ajax()``` method.


Another Usage example:

```JavaScript
	function doSomething(param) {
		if (!param) {
			return $.ProcessFactory()
						.reject('Missing param') //alway fail
						.promise(this)           //and bind to current scope
			;
		}

		if (window.SomethingCache[param]) {
			return $.ProcessFactory(this) //bind scope by Factory
						.resolve(window.SomethingCache[param]) //return cached result
						.promise() //return scope from Factory
		}

		var process = new $.Process();
		$.ajax({url:'/something/' + param})
				.success(process.resolve)
				.error(process.reject);

		//register own handlers for the process
		process.done(function() { console.log('Something is done'); });
		process.fail(function() { console.log('Something has failed'); });
		process.on('Waiting_for_AJAX', function(event, message) {
			console.log('AJAX sent');
		}

		process.notify('Waiting for AJAX'); //report that we must wait for result

		//allow caller to register own handlers for this process
		return process.promise(this);
	} //doSomething()

	var myValues = { something: 'something', value: null };

	doSomething.call(myValues, myValues.something)
					.done(function(result) {
						this.value = result.value; //store result into myValues
					})
					.always(function() {
						//for debugging only
						alert(JSON.stringify(MyValues));
					})
	; //doSomething(myValues)
```

Using promise correctly:

The ```Process.promise()``` method works as same as any jQuery method, i.e. it stores given value and returns it when called without param. As a result every time you call promise with an object, it will change scope for all the past and future callbacks registered with ```done()```, ```fail()``` and ```progress()```.

```JavaScript
	scope = {value: 'Me'};

	process = new $.Process();
	process.promise(scope);

	process.promise().done(function() {
		alert('Promise ' + this.value);
	});

	process.promise({value: 'You'});

	process.promiseWith(scope).done(function() {
		alert('Promised by ' + this.value);
	});

	process.resolve(); //will alert 'Promise You' and 'Promised by You'
```

Note that method ```promiseWith()``` will return promise bound to given object but will not change the stored scope. All handlers registered on promise created with ```promiseWith()``` will be called in scope of the last scope registered with ```promise()```!

However handlers registered by ```done()```, ```fail()``` and ```progress()``` of the Process itself will be called in the scope of the Process. This allows the internal Process handlers to trigger another ```notify()```, ```resolve()``` or ```reject()```. Remember to use ```Process.promise()``` to access values shared in the promise.

Methods ```then()``` and ```catch()``` are also available for compatibility with ECMAScript 2015 (ES6) Promises. Both methods can be called either on a process or a promise and return the original scope for chaining. The method ```then()``` accepts 3 parameters that bind to ```done()```, ```fail()``` and ```progress()``` (the same method in ES6 accept only 2 params for onFulfilled and onRejected). 

```JavaScript
	process = new $.Process();

	process.value = 'me';
	process.promise({value:'you'});

	process.on('finish', function() {
		alert('Process ' + this.value);
		this.promise().result = 'finish';
		this.resolve();
	});
	process.promise()
		.on('finish', function() {
			alert('Promised by ' + this.value);
		})
		.done(function() {
			alert('Promise done with action ' + this.result);
		})
	;
	process.notify('finish'); //will alert "Process me", "Promise done with action finish" and "Promised by you"
```

Promise also provide methods ```on()```, ```one()```, ```off()```, ```trigger()``` and ```triggerHandler()``` available in jQuery for event listening. When a Process call ```notify('string')``` method, it can trigger both callbacks registered with ```progress()``` and ```on()``` or ```one()```. Handlers registered by ```on()``` or ```one()``` are called only when the first parameter of notify is a string. Then an event with given name is triggered. Any spaces in the string are replaced with underscope (_) to allow event registering for string errors, e.g. after ```Process.notify('Missing params')``` it will trigger handler registered with ```Promise.on('Missing_params', ...)```.
Please note that ```Process.notify()``` works as both ```Deferred.notify()``` and ```jQuery.on()```. Calling Process.notify('test')``` will first trigger method ```Process.test()```, then it will trigger all handlers registered with ```Process.on('test') and last it will trigger all ```Process.progress()``` handlers.

Passing values via the promise:

Since the promise is shared with all handlers, they can store values there and use its values:

```JavaScript
	process = new $.Process(); //no promise given, will use default one

	process.promise()
		.done(function() {
			alert('Promise ' + this.value);
		});
		.progress(function(who) {
			this.value = who;
		})
	;

	process.notify('You');

	process.resolve(); //will alert 'Promise You'
```

Using different scope for handlers:

```JavaScript
	me = {value: 'me'};
	you = {value: 'you'};

	mainProcess = $.ProcessFactory(me);
	slaveProcess = $.ProcessFactory(you);

	f = function() { alert('Done ' + this.value); };

	mainProcess.promise().done(f);
	slaveProcess.promise().done(f);

	mainProcess.sync(slaveProcess);

	mainProcess.resolve(); //will alert 'Done me' and 'Done you'
```

Use method ```Process.sync()``` to synchronize two or more processes (with different promise objects). Once the main process is done or fails, synchronized processes will be resolved or rejected as well. Synchronized processes also recieve all progress events of the main process. Note that sync method is only one-way which means resolving or rejecting slave process will not affect the main process in any way.

Waiting for one or more other processes:

```JavaScript
	js = $.getScript('/my.js'); //returns ajax
	css = $.get('/my.css'); //returns ajax
    proc = $('el').translate('OK'); //return Process 

	all = new $.Process();
    all.done(function() { alert('All done'); });
    all.fail(function() { alert('Something failed'); });
    
    first = new $.Process();
    first.done(function() { alert('First one is done'); });
    first.fail(function() { alert('First one has failed'); });

	all.all(js, css, proc); //will alert 'All done' or 'Something failed'
    first.race(js, css, proc);  //will alert 'First one is done' or 'First one has failed'
```

Methods ```all()``` and ```race()``` make current process resolved or rejected based on a result of one or all processes passed as parameters. Method ```all()``` waits until all processes are done and then resolves the main process, while method ```race()``` resolves as soon as any of the processes is resolved. Method ```all()``` rejects the main process if any of the processes fails. Method ```race()``` rejects the main process if first finished process fails. These methods are compatible with ECMAScript 2015 (ES6). As an processes is accepted another process (```$.Process```), jQuery deffered (```$.Deffered()```), jQuery ajax (```$.ajax()```), ES6 Promise (```new Promise()```) or any object with method ```then()```.  Any other params (including ```undefined``` and ```null```) are ignored and does not change the result.
                                                                                                                                                                                                                            

Using Process as ```$.ajax()``` replacement:

```JavaScript
	$.api = function(method) {
		var process = new $.Process();

		if (!method || 'string' !== typeof method) {
			return process.rejectAjax('Missing API method').ajax();
		}

		if ($.api.cache[method]) {
			return process.resolveAjax($.api.cache[method]).ajax();
		}

		process.done(function(result) {
			$.api.cache[method] = result;
		});

		return $.ajax({
			url: '/api/' + method
		}).success(process.resolve).error(process.reject);
	}; //$.api()
	$.api.cache = {};

	$.api('translations')
		.success(function(result) {
			$('#title').text(result.title);
		})
		.error(xhr, message) {
			alert(message);
		}
	;
```

With ```Process.ajax()``` method, you can create jqXHR-compatible Promise to replace original ```$.ajax()``` return value. The jqXHR Promise (in addition to all Promise methods) support methods ```success(done)```, ```error(fail)``` and ```then(done, fail, progress)```.

Methods ```resolveAjax()``` and ```rejectAjax()``` make sure the callbacks of success/done and error/fail get params in same order as from ```$.ajax()``` method, i.e. for success/done only first and second param of ```resolveAjax()``` is passed and the 3rd param is jqXHR (created with ```Process.ajax()```); for error/fail first param is jqXHR and second and third params are the first and second params of ```rejectAjax()```. Also the callbacks of ```resolveAjax()``` and ```rejectAjax()``` are not called immediatelly inside these methods, but with a little delay to simulate behavior of the AJAX.