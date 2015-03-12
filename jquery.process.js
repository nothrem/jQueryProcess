/**
 * jQueryProcess
 * https://github.com/nothrem/jQueryProcess
 * Improved jQuery Deferred that will always remember scope given into the promise.
 * Code based on jQuery code of $.Deferred function
 * Code improved for better performance and extended by Nothrem Sinsky: https://github.com/nothrem
 * (c) 2015
 */

(function($) {
	if (!$) { return; }

	$.Process = function( init ) {
		$.ProcessFactory.call(this, {}, init);
	};

	$.ProcessFactory = function( source, init ) {
		var process;

		if (this instanceof $.Process) {
			process = this;
		}
		else {
			process = new $.Process( init );
			process.promise(source);
			return process;
		}

		var tuples = [
				// action, add listener, listener list, final state
				// must be created every time because of the $.Callbacks()
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					process.done( arguments ).fail( arguments );
					return this;
				},
				promise: function( obj ) {
					source = promise.promiseWith(obj);
					return source;
				},
				promiseWith: function( obj ) {
					return obj !== null ? jQuery.extend( obj, promise ) : promise;
				},
				ajax: function( obj ) {
					promise.promise(obj);
					return promise.ajaxWith(obj);
				},
				ajaxWith: function( obj ) {
					var jqXHR = promise.promiseWith(obj);
					jqXHR.success = jqXHR.done;
					jqXHR.error = jqXHR.fail;
					jqXHR.then = function(done, fail, progress) {
						(!done || this.done(done));
						(!fail || this.fail(fail));
						(!progress || this.progress(progress));
						return this;
					};
					return jqXHR;
				}
			};
		//var

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// process[ resolve | reject | notify ]
			process[ tuple[0] ] = function() {
				process[ tuple[0] + "With" ]( source , arguments );
				return this;
			};
			process[ tuple[0] + "Ajax" ] = function() {
				var args = arguments, jqXHR = promise.ajax();
				if ('resolve' === tuple[0]) { args = [args[0], args[1], jqXHR]; }
				else if ('reject' === tuple[0]) { args = [jqXHR, args[0], args[1]]; }
				window.setTimeout(function() { process[ tuple[0] + "With" ]( jqXHR , args ); }, 1);
				return this;
			};
			process[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the process a promise
		promise.promise( process );
		promise.promise( source !== null ? source : {});

		// Call given func if any
		if ( init ) {
			init.call( process, process );
		}

		// All done!
		return process;
	};

})(window.jQuery);
