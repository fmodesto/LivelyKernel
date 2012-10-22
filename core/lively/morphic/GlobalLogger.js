module('lively.morphic.GlobalLogger').requires().toRun(function() {
Object.subclass('lively.GlobalLogger',
'initialization', {
    initialize: function () {
		this.stack = [];
		this.counter = 0;
    }
},
'logging', {
    logRenderAttributeSetter: function(renderObject, propName, value) {
        if (renderObject.isLoggable) {
            var before = renderObject['_' + propName],
                after = value,
                string = 'setting property '
					+ propName+' of '
					+ renderObject.toString()
					+ ' from '
					+ renderObject['_' + propName]
					+ ' to '
					+ value;
                this.logAction({
                    string: string,
					morph: renderObject,
					type: 'property',
					time: (new Date ()).getTime(),
                    undo: (function () {
							if (propName === 'Position' && before === undefined)
								return false
							this['_' + propName] = before;
							return this.renderContextDispatch('set' + propName, before);
                        }).bind(renderObject),
                    redo: (function () {
							if (propName === 'Position' && after === undefined)
								return false
							this['_' + propName] = after;
							return this.renderContextDispatch('set' + propName, after);
						}).bind(renderObject)
                });
		}
    },
	logAddMorph: function (newOwner, morph, optMorphBefore) {
		// dirty hack next line
		if (this.loggingEnabled && morph.isLoggable && !(morph instanceof lively.morphic.Window)) {
			var self = this,
				string = 'adding Morph '
					+ morph.toString()
					+ ' to '
					+ newOwner.toString(),
				owner = morph.owner

			if (owner && owner.isLoggable) {
				var undoFunc = owner.addMorph.bind(owner, morph, owner.submorphs.find(function (ea) {
					return owner.submorphs[(owner.submorphs.indexOf(ea))-1] === morph
				}))
			}
			else {
				var undoFunc = morph.remove.bind(morph);
			}
			if (!newOwner.isLoggable && !(newOwner instanceof lively.morphic.HandMorph)) {
				//this.deleteRecentLogs()
				return false
			}
			var handPos = $world.firstHand().getPosition()
			this.logAction({
				string: string,
				morph: morph,
				type: 'addition',
				time: (new Date ()).getTime(),
				undo: function () {
						undoFunc()
					},
				redo: function () {
						if (owner instanceof lively.morphic.HandMorph)
							morph.setPosition(handPos.subPt(newOwner.getPositionInWorld()))
						if (newOwner.isLoggable)
							newOwner.addMorph(morph, optMorphBefore)
						else
							morph.remove()
					}
			});
		}
    },
	logRemove: function (morph) {
		if (!morph)
			return
		// dirty hack next line
		if (this.loggingEnabled && morph.isLoggable && !(morph instanceof lively.morphic.Window)) {
			var self = this,
				world = lively.morphic.World.current(),
				string = 'removing Morph '
					+ morph.toString()
				owner = morph.owner;
			if (owner)
				string.concat(' from ' + owner.toString())
			// TODO: this fucks up adding and when redone adds 2^n entries to the list
			var action = {
				string: string,
				morph: morph,
				type: 'removal',
				time: (new Date ()).getTime(),
				redo: function () {
						morph.remove()
					}
			}
			if (owner) {
				action.undo = function () {
						if (owner instanceof lively.morphic.HandMorph)
								return
						owner.addMorph(morph, owner.submorphs.find(function (ea) {
							return owner.submorphs[(owner.submorphs.indexOf(ea))-1] === this
						}.bind(morph)))
					}
			}
			else {
				action.undo = function () {};
			}
			this.logAction(action);
		}
	},
	logAction: function(action) {
		if (this.loggingEnabled === false 
			|| action.morph.isLoggable === false
			|| (action.morph.ownerChain && action.morph.ownerChain().find(function (ea) {return !ea.isLoggable && !ea instanceof lively.morphic.HandMorph})))
			return
		if (this.stack.length > this.counter) {
			this.stack.splice(this.counter)
		}
		// keep changes at a bundle if they happen at the same time
		if (this.stack.last() && this.stack.last().last() && (action.time - this.stack.last().last().time) <= 100) {
			this.stack.last().push(action)
		}
		else {
			this.stack.push([action])
			this.counter ++
		}
	},
	undoLastAction: function () {
		var self = this;
		if (this.counter <= 0) {
			console.log('Nothing to undo')
			return false
		}
		this.stack[this.counter-1] && this.stack[this.counter-1].reverse().each(function (ea) {
			self.undoAction(ea);
		})
		this.counter --
	},
	undoAction: function (action) {
		this.disableLogging()
		debugger
		if (action.morph.getLoggability && action.morph.getLoggability() || !action.morph.getLoggability)
			action.undo();
		this.enableLogging()
	},
	redoNextAction: function () {
		var self = this;
		if (this.counter > this.stack.length) {
			console.log('Nothing to redo')
			return false
		}
		this.stack[this.counter] && this.stack[this.counter].reverse().each(function (ea) {
			self.redoAction(ea);
		})
		this.counter ++
	},
	redoAction: function (action) {
		this.disableLogging()
		if (action.morph.getLoggability && action.morph.getLoggability()  || !action.morph.getLoggability)
			action.redo()
		this.enableLogging()
	},
	enableLogging: function () {
		this.loggingEnabled = true
	},
	disableLogging: function () {
		this.loggingEnabled = false
	},
	deleteRecentLogs: function () {
		this.stack.splice(this.counter)
	}
}
)}) // end of module