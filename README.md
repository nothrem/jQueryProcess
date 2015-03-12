# jQueryProcess
Improved jQuery Deferred that will always remember scope given into the promise and call the listeners so that they share the 'this' variable.
As a bonus, it can supply replacement for $.ajax() return value derived from Deferred and allows to simulate successful or failed Ajax request.

Passing promises in original $.Deferred:

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

Keeping scope with jquery.process:

```JavaScript
	scope = {value: 'Me'};

	process1 = $.ProcessFactory(); //use as a Factory
	process2 = new $.Process();    //or classic 'new Class()'

	process2.promise(scope); //register scope for callbacks

	process2.done(function() {
		alert(this.value);
	});

	process1.done(process2.resolve); //simply assign resolve as the callback
	process1.fail(process2.reject);  //and the same go for reject and notify

	process1.resolve(); //will alert 'Me'
```

Differences:

* jquery.process has correct OOP naming of methods:
  *  create new instance of Process with ```new $.Process()```
  *  use Factory to get instance of Process with ```$.ProcessFactory()```
  *  you can use ```instanceof``` of the created Process object
    * note: Promise is always of the provided type or base object if no source given
  * $.Deferred seems to be class by its name but in fact it's a factory that creates untyped object based on basic Object class
* simply calling process.promise() with an object will remember this object and provide it as scope for all done() and fail() callbacks
* you can use Process' resolve(), reject() and notify() methods as callbacks for another Process, Deferred or any method that expect a callback
  * for Deferred you have to create own Closure by bind() or a function
* Process does not support deprecated methods of jQuery (success, error, then and pipe). Only available methods are resolve, reject and notify for Process and done, fail and always for Promise.
  * alternative *With methods (resolveWith, rejectWith, notifyWith) are also available as fallover for Deferred - they don't work with stored promise.
  * method Process.promiseWith() works the same as Deferred.promise()
  * Deferred's state() method is also available (do anyone actually use it?)


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

The Process.promise() method works as same as any jQuery method, i.e. it stores given value and returns it when called without param. As a result every time you call promise with an object, it will change scope for all the past and future callbacks registered with done(), fail() and progress().

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

Note that method promiseWith will return promise bound to given object but will not change the stored scope. All handlers registered on promise created with promiseWith() will be called in scope of the last scope registered with promise()!

Passing values via the promise:

Since the promise is shared with all handlers, they can store values there and use its values:

```JavaScript
	process = new $.Process(); //no promise given, will use default one

	process.done(function() {
		alert('Promise ' + this.value);
	});
	process.progress(function(who) {
		this.value = who;
	});

	process.notify('You');

	process.resolve(); //will alert 'Promise You'
```

Using Process as $.ajax replacement:

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

With ajax() method, you can create jqXHR-compatible Promise to replace original $.ajax() return value. The jqXHR Promise (in addition to all Promise methods) support methods success(done), error(fail) and then(done, fail, progress).

Methods resolveAjax() and rejectAjax() make sure the callbacks of success/done and error/fail get params in same order as from $.ajax() method, i.e. for success/done only first and second param of resolveAjax() is passed and the 3rd param is jqXHR (created with Process.ajax()); for error/fail first param is jqXHR and second and third params are the first and second params of rejectAjax().