window.log=function(){log.history=log.history||[];log.history.push(arguments);if(this.console){arguments.callee=arguments.callee.caller;var a=[].slice.call(arguments);(typeof console.log==="object"?log.apply.call(console.log,console,a):console.log.apply(console,a))}};
(function(b){function c(){}for(var d="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,timeStamp,profile,profileEnd,time,timeEnd,trace,warn".split(","),a;a=d.pop();){b[a]=b[a]||c}})((function(){try
{console.log();return window.console;}catch(err){return window.console={};}})());

/*
* jQuery UI Tag-it!
*
* @version v2.0 (06/2011)
*
* Copyright 2011, Levy Carneiro Jr.
* Released under the MIT license.
* http://aehlke.github.com/tag-it/LICENSE
*
* Homepage:
*   http://aehlke.github.com/tag-it/
*
* Authors:
*   Levy Carneiro Jr.
*   Martin Rehfeld
*   Tobias Schmidt
*   Skylar Challand
*   Alex Ehlke
*
* Maintainer:
*   Alex Ehlke - Twitter: @aehlke
*
* Dependencies:
*   jQuery v1.4+
*   jQuery UI v1.8+
*/
(function($) {

    $.widget('ui.tagit', {
        options: {
            itemName          : 'item',
            fieldName         : 'tags',
            availableTags     : [],
            tagSource         : null,
            removeConfirmation: false,
            caseSensitive     : true,

            // When enabled, quotes are not neccesary
            // for inputting multi-word tags.
            allowSpaces: false,

            // Whether to animate tag removals or not.
            animate: true,

            // The below options are for using a single field instead of several
            // for our form values.
            //
            // When enabled, will use a single hidden field for the form,
            // rather than one per tag. It will delimit tags in the field
            // with singleFieldDelimiter.
            //
            // The easiest way to use singleField is to just instantiate tag-it
            // on an INPUT element, in which case singleField is automatically
            // set to true, and singleFieldNode is set to that element. This 
            // way, you don't need to fiddle with these options.
            singleField: false,

            singleFieldDelimiter: ',',

            // Set this to an input DOM node to use an existing form field.
            // Any text in it will be erased on init. But it will be
            // populated with the text of tags as they are created,
            // delimited by singleFieldDelimiter.
            //
            // If this is not set, we create an input node for it,
            // with the name given in settings.fieldName, 
            // ignoring settings.itemName.
            singleFieldNode: null,

            // Optionally set a tabindex attribute on the input that gets
            // created for tag-it.
            tabIndex: null,


            // Event callbacks.
            onTagAdded  : null,
            onTagRemoved: null,
            onTagClicked: null
        },


        _create: function() {
            // for handling static scoping inside callbacks
            var that = this;

            // There are 2 kinds of DOM nodes this widget can be instantiated on:
            //     1. UL, OL, or some element containing either of these.
            //     2. INPUT, in which case 'singleField' is overridden to true,
            //        a UL is created and the INPUT is hidden.
            if (this.element.is('input')) {
                this.tagList = $('<ul></ul>').insertAfter(this.element);
                this.options.singleField = true;
                this.options.singleFieldNode = this.element;
                this.element.css('display', 'none');
            } else {
                this.tagList = this.element.find('ul, ol').andSelf().last();
            }

            this._tagInput = $('<input type="text">').addClass('ui-widget-content');
            if (this.options.tabIndex) {
                this._tagInput.attr('tabindex', this.options.tabIndex);
            }

            this.options.tagSource = this.options.tagSource || function(search, showChoices) {
                var filter = search.term.toLowerCase();
                var choices = $.grep(that.options.availableTags, function(element) {
                    // Only match autocomplete options that begin with the search term.
                    // (Case insensitive.)
                    return (element.toLowerCase().indexOf(filter) === 0);
                });
                showChoices(that._subtractArray(choices, that.assignedTags()));
            };

            this.tagList
                .addClass('tagit')
                .addClass('ui-widget ui-widget-content ui-corner-all')
                // Create the input field.
                .append($('<li class="tagit-new"></li>').append(this._tagInput))
                .click(function(e) {
                    var target = $(e.target);
                    if (target.hasClass('tagit-label')) {
                        that._trigger('onTagClicked', e, target.closest('.tagit-choice'));
                    } else {
                        // Sets the focus() to the input field, if the user
                        // clicks anywhere inside the UL. This is needed
                        // because the input field needs to be of a small size.
                        that._tagInput.focus();
                    }
                });

            // Add existing tags from the list, if any.
            this.tagList.children('li').each(function() {
                if (!$(this).hasClass('tagit-new')) {
                    that.createTag($(this).html(), $(this).attr('class'));
                    $(this).remove();
                }
            });

            // Single field support.
            if (this.options.singleField) {
                if (this.options.singleFieldNode) {
                    // Add existing tags from the input field.
                    var node = $(this.options.singleFieldNode);
                    var tags = node.val().split(this.options.singleFieldDelimiter);
                    node.val('');
                    $.each(tags, function(index, tag) {
                        that.createTag(tag);
                    });
                } else {
                    // Create our single field input after our list.
                    this.options.singleFieldNode = this.tagList.after('<input type="hidden" style="display:none;" value="" name="' + this.options.fieldName + '">');
                }
            }

            // Events.
            this._tagInput
                .keydown(function(event) {
                    // Backspace is not detected within a keypress, so it must use keydown.
                    if (event.which == $.ui.keyCode.BACKSPACE && that._tagInput.val() === '') {
                        var tag = that._lastTag();
                        if (!that.options.removeConfirmation || tag.hasClass('remove')) {
                            // When backspace is pressed, the last tag is deleted.
                            that.removeTag(tag);
                        } else if (that.options.removeConfirmation) {
                            tag.addClass('remove ui-state-highlight');
                        }
                    } else if (that.options.removeConfirmation) {
                        that._lastTag().removeClass('remove ui-state-highlight');
                    }

                    // Comma/Space/Enter are all valid delimiters for new tags,
                    // except when there is an open quote or if setting allowSpaces = true.
                    // Tab will also create a tag, unless the tag input is empty, in which case it isn't caught.
                    if (
                        event.which == $.ui.keyCode.COMMA ||
                        event.which == $.ui.keyCode.ENTER ||
                        (
                            event.which == $.ui.keyCode.TAB &&
                            that._tagInput.val() !== ''
                        ) ||
                        (
                            event.which == $.ui.keyCode.SPACE &&
                            that.options.allowSpaces !== true &&
                            (
                                $.trim(that._tagInput.val()).replace( /^s*/, '' ).charAt(0) != '"' ||
                                (
                                    $.trim(that._tagInput.val()).charAt(0) == '"' &&
                                    $.trim(that._tagInput.val()).charAt($.trim(that._tagInput.val()).length - 1) == '"' &&
                                    $.trim(that._tagInput.val()).length - 1 !== 0
                                )
                            )
                        )
                    ) {
                        event.preventDefault();
                        that.createTag(that._cleanedInput());

                        // The autocomplete doesn't close automatically when TAB is pressed.
                        // So let's ensure that it closes.
                        that._tagInput.autocomplete('close');
                    }
                }).blur(function(e){
                    // Create a tag when the element loses focus (unless it's empty).
                    that.createTag(that._cleanedInput());
                });
                

            // Autocomplete.
            if (this.options.availableTags || this.options.tagSource) {
                this._tagInput.autocomplete({
                    source: this.options.tagSource,
                    select: function(event, ui) {
                        // Delete the last tag if we autocomplete something despite the input being empty
                        // This happens because the input's blur event causes the tag to be created when
                        // the user clicks an autocomplete item.
                        // The only artifact of this is that while the user holds down the mouse button
                        // on the selected autocomplete item, a tag is shown with the pre-autocompleted text,
                        // and is changed to the autocompleted text upon mouseup.
                        if (that._tagInput.val() === '') {
                            that.removeTag(that._lastTag(), false);
                        }
                        that.createTag(ui.item.value);
                        // Preventing the tag input to be updated with the chosen value.
                        return false;
                    }
                });
            }
        },

        _cleanedInput: function() {
            // Returns the contents of the tag input, cleaned and ready to be passed to createTag
            return $.trim(this._tagInput.val().replace(/^"(.*)"$/, '$1'));
        },

        _lastTag: function() {
            return this.tagList.children('.tagit-choice:last');
        },

        assignedTags: function() {
            // Returns an array of tag string values
            var that = this;
            var tags = [];
            if (this.options.singleField) {
                tags = $(this.options.singleFieldNode).val().split(this.options.singleFieldDelimiter);
                if (tags[0] === '') {
                    tags = [];
                }
            } else {
                this.tagList.children('.tagit-choice').each(function() {
                    tags.push(that.tagLabel(this));
                });
            }
            return tags;
        },

        _updateSingleTagsField: function(tags) {
            // Takes a list of tag string values, updates this.options.singleFieldNode.val to the tags delimited by this.options.singleFieldDelimiter
            $(this.options.singleFieldNode).val(tags.join(this.options.singleFieldDelimiter));
        },

        _subtractArray: function(a1, a2) {
            var result = [];
            for (var i = 0; i < a1.length; i++) {
                if ($.inArray(a1[i], a2) == -1) {
                    result.push(a1[i]);
                }
            }
            return result;
        },

        tagLabel: function(tag) {
            // Returns the tag's string label.
            if (this.options.singleField) {
                return $(tag).children('.tagit-label').text();
            } else {
                return $(tag).children('input').val();
            }
        },

        _isNew: function(value) {
            var that = this;
            var isNew = true;
            this.tagList.children('.tagit-choice').each(function(i) {
                if (that._formatStr(value) == that._formatStr(that.tagLabel(this))) {
                    isNew = false;
                    return false;
                }
            });
            return isNew;
        },

        _formatStr: function(str) {
            if (this.options.caseSensitive) {
                return str;
            }
            return $.trim(str.toLowerCase());
        },

        createTag: function(value, additionalClass) {
            var that = this;
            // Automatically trims the value of leading and trailing whitespace.
            value = $.trim(value);

            if (!this._isNew(value) || value === '') {
                return false;
            }

            var label = $(this.options.onTagClicked ? '<a class="tagit-label"></a>' : '<span class="tagit-label"></span>').text(value);

            // Create tag.
            var tag = $('<li></li>')
                .addClass('tagit-choice ui-widget-content ui-state-default ui-corner-all')
                .addClass(additionalClass)
                .append(label);

            // Button for removing the tag.
            var removeTagIcon = $('<span></span>')
                .addClass('ui-icon ui-icon-close');
            var removeTag = $('<a><span class="text-icon">\xd7</span></a>') // \xd7 is an X
                .addClass('close')
                .append(removeTagIcon)
                .click(function(e) {
                    // Removes a tag when the little 'x' is clicked.
                    that.removeTag(tag);
                });
            tag.append(removeTag);

            // Unless options.singleField is set, each tag has a hidden input field inline.
            if (this.options.singleField) {
                var tags = this.assignedTags();
                tags.push(value);
                this._updateSingleTagsField(tags);
            } else {
                var escapedValue = label.html();
                tag.append('<input type="hidden" style="display:none;" value="' + escapedValue + '" name="' + this.options.itemName + '[' + this.options.fieldName + '][]">');
            }

            this._trigger('onTagAdded', null, tag);

            // Cleaning the input.
            this._tagInput.val('');

            // insert tag
            this._tagInput.parent().before(tag);
        },
        
        removeTag: function(tag, animate) {
            animate = animate || this.options.animate;

            tag = $(tag);

            this._trigger('onTagRemoved', null, tag);

            if (this.options.singleField) {
                var tags = this.assignedTags();
                var removedTagLabel = this.tagLabel(tag);
                tags = $.grep(tags, function(el){
                    return el != removedTagLabel;
                });
                this._updateSingleTagsField(tags);
            }
            // Animate the removal.
            if (animate) {
                tag.fadeOut('fast').hide('blind', {direction: 'horizontal'}, 'fast', function(){
                    tag.remove();
                }).dequeue();
            } else {
                tag.remove();
            }
        },

        removeAll: function() {
            // Removes all tags.
            var that = this;
            this.tagList.children('.tagit-choice').each(function(index, tag) {
                that.removeTag(tag, false);
            });
        }

    });

})(jQuery);

/*
 * Inline Form Validation Engine 2.2, jQuery plugin
 *
 * Copyright(c) 2010, Cedric Dugas
 * http://www.position-absolute.com
 *
 * 2.0 Rewrite by Olivier Refalo
 * http://www.crionics.com
 *
 * Form validation engine allowing custom regex rules to be added.
 * Licensed under the MIT License
 */
(function($) {

    var methods = {

        /**
         * Kind of the constructor, called before any action
         * @param {Map} user options
         */
        init: function(options) {
            var form = this;
            if (!form.data('jqv') || form.data('jqv') == null ) {
                methods._saveOptions(form, options);

                // bind all formError elements to close on click
                $(".formError").live("click", function() {
                    $(this).fadeOut(150, function() {

                        // remove prompt once invisible
                        $(this).remove();
                    });
                });
            }
        },
        /**
         * Attachs jQuery.validationEngine to form.submit and field.blur events
         * Takes an optional params: a list of options
         * ie. jQuery("#formID1").validationEngine('attach', {promptPosition : "centerRight"});
         */
        attach: function(userOptions) {
            
            var form = this;
            var options;

            if(userOptions)
                options = methods._saveOptions(form, userOptions);
            else
                options = form.data('jqv');

            var validateAttribute = (form.find("[data-validation-engine*=validate]")) ? "data-validation-engine" : "class";
            
            if (!options.binded) {
                    if (options.bindMethod == "bind"){
                        
                        // bind fields
                        form.find("[class*=validate]:not([type=checkbox])").not("[type=radio]").not(".datepicker").bind(options.validationEventTrigger, methods._onFieldEvent);
                        form.find("[class*=validate][type=checkbox],[class*=validate][type=radio]").bind("click", methods._onFieldEvent);
                        
                        form.find("[class*=validate][class*=datepicker]").bind(options.validationEventTrigger,{"delay": 300}, methods._onFieldEvent);

                        // bind form.submit
                        form.bind("submit", methods._onSubmitEvent);
                    } else if (options.bindMethod == "live") {
                        // bind fields with LIVE (for persistant state)
                        form.find("[class*=validate]:not([type=checkbox])").not(".datepicker").live(options.validationEventTrigger, methods._onFieldEvent);
                        form.find("[class*=validate][type=checkbox]").live("click", methods._onFieldEvent);

                        form.find("[class*=validate][class*=datepicker]").live(options.validationEventTrigger,{"delay": 300}, methods._onFieldEvent);

                        // bind form.submit
                        form.live("submit", methods._onSubmitEvent);
                    }

                options.binded = true;
            }

        },
        /**
         * Unregisters any bindings that may point to jQuery.validaitonEngine
         */
        detach: function() {
            var form = this;
            var options = form.data('jqv');
            if (options.binded) {

                // unbind fields
                form.find("[class*=validate]").not("[type=checkbox]").unbind(options.validationEventTrigger, methods._onFieldEvent);
                form.find("[class*=validate][type=checkbox],[class*=validate][type=radio]").unbind("click", methods._onFieldEvent);

                // unbind form.submit
                form.unbind("submit", methods.onAjaxFormComplete);
                
               
                // unbind live fields (kill)
                form.find("[class*=validate]").not("[type=checkbox]").die(options.validationEventTrigger, methods._onFieldEvent);
                form.find("[class*=validate][type=checkbox]").die("click", methods._onFieldEvent);
                // unbind form.submit

                


                form.die("submit", methods.onAjaxFormComplete);
                
                form.removeData('jqv');
            }
        },
        /**
         * Validates the form fields, shows prompts accordingly.
         * Note: There is no ajax form validation with this method, only field ajax validation are evaluated
         *
         * @return true if the form validates, false if it fails
         */
        validate: function() {
            return methods._validateFields(this);
        },
        /**
         * Validates one field, shows prompt accordingly.
         * Note: There is no ajax form validation with this method, only field ajax validation are evaluated
         *
         * @return true if the form validates, false if it fails
         */
        validateField: function(el) {
            var options = $(this).data('jqv');
            return methods._validateField($(el), options);
        },
        /**
         * Validates the form fields, shows prompts accordingly.
         * Note: this methods performs fields and form ajax validations(if setup)
         *
         * @return true if the form validates, false if it fails, undefined if ajax is used for form validation
         */
        validateform: function() {
            return methods._onSubmitEvent.call(this);
        },
        /**
         *  Redraw prompts position, useful when you change the DOM state when validating
         */
        updatePromptsPosition: function() {
            var form = this.closest('form');
            var options = form.data('jqv');
            // No option, take default one
            form.find('[class*=validate]').not(':hidden').not(":disabled").each(function(){
                var field = $(this);

                var prompt = methods._getPrompt(field);
                var promptText = $(prompt).find(".formErrorContent").html();

                if(prompt) methods._updatePrompt(field, $(prompt), promptText, undefined, false, options);
            })
        },
        /**
         * Displays a prompt on a element.
         * Note that the element needs an id!
         *
         * @param {String} promptText html text to display type
         * @param {String} type the type of bubble: 'pass' (green), 'load' (black) anything else (red)
         * @param {String} possible values topLeft, topRight, bottomLeft, centerRight, bottomRight
         */
        showPrompt: function(promptText, type, promptPosition, showArrow) {

            var form = this.closest('form');
            var options = form.data('jqv');
            // No option, take default one
            if(!options) options = methods._saveOptions(this, options);
            if(promptPosition)
                options.promptPosition=promptPosition;
            options.showArrow = showArrow==true;

            methods._showPrompt(this, promptText, type, false, options);
        },
        /**
         * Closes all error prompts on the page
         */
        hidePrompt: function() {
            var promptClass =  "."+ methods._getClassName($(this).attr("id")) + "formError";
            $(promptClass).fadeTo("fast", 0.3, function() {
                $(this).remove();
            });
        },
        /**
         * Closes form error prompts, CAN be invidual
         */
        hide: function() {
            var closingtag;
            if($(this).is("form")){
                closingtag = "parentForm"+$(this).attr('id');
            }else{
                closingtag = $(this).attr('id') +"formError";
            }
            $('.'+closingtag).fadeTo("fast", 0.3, function() {
                $(this).remove();
            });
        },
        /**
         * Closes all error prompts on the page
         */
        hideAll: function() {
            $('.formError').fadeTo("fast", 0.3, function() {
                $(this).remove();
            });
        },
        /**
         * Typically called when user exists a field using tab or a mouse click, triggers a field
         * validation
         */
        _onFieldEvent: function(event) {
            var field = $(this);
            var form = field.closest('form');
            var options = form.data('jqv');
            // validate the current field
            window.setTimeout(function() {
                methods._validateField(field, options);
            }, (event.data) ? event.data.delay : 0);
            
        },
        /**
         * Called when the form is submited, shows prompts accordingly
         *
         * @param {jqObject}
         *            form
         * @return false if form submission needs to be cancelled
         */
        _onSubmitEvent: function() {
            var form = $(this);
            var options = form.data('jqv');
   
            // validate each field (- skip field ajax validation, no necessary since we will perform an ajax form validation)
            var r=methods._validateFields(form, true);
        
            if (r && options.ajaxFormValidation) {
                methods._validateFormWithAjax(form, options);
                return false;
            }

            if(options.onValidationComplete) {
                options.onValidationComplete(form, r);
                return false;
            }
            return r;
        },

        /**
         * Return true if the ajax field validations passed so far
         * @param {Object} options
         * @return true, is all ajax validation passed so far (remember ajax is async)
         */
        _checkAjaxStatus: function(options) {
            var status = true;
            $.each(options.ajaxValidCache, function(key, value) {
                if (!value) {
                    status = false;
                    // break the each
                    return false;
                }
            });
            return status;
        },
        /**
         * Validates form fields, shows prompts accordingly
         *
         * @param {jqObject}
         *            form
         * @param {skipAjaxFieldValidation}
         *            boolean - when set to true, ajax field validation is skipped, typically used when the submit button is clicked
         *
         * @return true if form is valid, false if not, undefined if ajax form validation is done
         */
        _validateFields: function(form, skipAjaxValidation) {
            var options = form.data('jqv');

            // this variable is set to true if an error is found
            var errorFound = false;
            
            // Trigger hook, start validation
            form.trigger("jqv.form.validating");
            // first, evaluate status of non ajax fields
            form.find('[class*=validate]').not(':hidden').not(":disabled").each( function() {
                var field = $(this);
                errorFound |= methods._validateField(field, options, skipAjaxValidation);
            });
            // second, check to see if all ajax calls completed ok
            // errorFound |= !methods._checkAjaxStatus(options);
            
            // thrird, check status and scroll the container accordingly
            form.trigger("jqv.form.result", [errorFound]);
            
            if (errorFound) {
                
                if (options.scroll) {

                    // get the position of the first error, there should be at least one, no need to check this
                    //var destination = form.find(".formError:not('.greenPopup'):first").offset().top;

                    // look for the visually top prompt
                    var destination = Number.MAX_VALUE;
                    var fixleft = 0;
                    var lst = $(".formError:not('.greenPopup')");

                    for (var i = 0; i < lst.length; i++) {
                        var d = $(lst[i]).offset().top;
                        if (d < destination){
                            destination = d;
                            fixleft = $(lst[i]).offset().left;
                        }
                    }

                    if (!options.isOverflown)
                        $("html:not(:animated),body:not(:animated)").animate({
                            scrollTop: destination,
                            scrollLeft: fixleft
                        }, 1100);
                    else {
                        var overflowDIV = $(options.overflownDIV);
                        var scrollContainerScroll = overflowDIV.scrollTop();
                        var scrollContainerPos = -parseInt(overflowDIV.offset().top);

                        destination += scrollContainerScroll + scrollContainerPos - 5;
                        var scrollContainer = $(options.overflownDIV + ":not(:animated)");

                        scrollContainer.animate({
                            scrollTop: destination
                        }, 1100);

                        $("html:not(:animated),body:not(:animated)").animate({
                            scrollTop: overflowDIV.offset().top,
                            scrollLeft: fixleft
                        }, 1100);
                    }
                }
                return false;
            }
            return true;
        },
        /**
         * This method is called to perform an ajax form validation.
         * During this process all the (field, value) pairs are sent to the server which returns a list of invalid fields or true
         *
         * @param {jqObject} form
         * @param {Map} options
         */
        _validateFormWithAjax: function(form, options) {

            var data = form.serialize();
            var url = (options.ajaxFormValidationURL) ? options.ajaxFormValidationURL : form.attr("action");
            $.ajax({
                type: "GET",
                url: url,
                cache: false,
                dataType: "json",
                data: data,
                form: form,
                methods: methods,
                options: options,
                beforeSend: function() {
                    return options.onBeforeAjaxFormValidation(form, options);
                },
                error: function(data, transport) {
                    methods._ajaxError(data, transport);
                },
                success: function(json) {

                    if (json !== true) {

                        // getting to this case doesn't necessary means that the form is invalid
                        // the server may return green or closing prompt actions
                        // this flag helps figuring it out
                        var errorInForm=false;
                        for (var i = 0; i < json.length; i++) {
                            var value = json[i];
                        
                            var errorFieldId = value[0];
                            var errorField = $($("#" + errorFieldId)[0]);
                            
                            // make sure we found the element
                            if (errorField.length == 1) {
                                
                                // promptText or selector
                                var msg = value[2];
                                // if the field is valid
                                if (value[1] == true) {

                                    if (msg == ""  || !msg){
                                        // if for some reason, status==true and error="", just close the prompt
                                        methods._closePrompt(errorField);
                                    } else {
                                        // the field is valid, but we are displaying a green prompt
                                        if (options.allrules[msg]) {
                                            var txt = options.allrules[msg].alertTextOk;
                                            if (txt)
                                                msg = txt;
                                        }
                                        methods._showPrompt(errorField, msg, "pass", false, options, true);
                                    }

                                } else {
                                    // the field is invalid, show the red error prompt
                                    errorInForm|=true;
                                    if (options.allrules[msg]) {
                                        var txt = options.allrules[msg].alertText;
                                        if (txt)
                                            msg = txt;
                                    }
                                    methods._showPrompt(errorField, msg, "", false, options, true);
                                }
                            }
                        }
                        options.onAjaxFormComplete(!errorInForm, form, json, options);
                    } else
                        options.onAjaxFormComplete(true, form, "", options);
                }
            });

        },
        /**
         * Validates field, shows prompts accordingly
         *
         * @param {jqObject}
         *            field
         * @param {Array[String]}
         *            field's validation rules
         * @param {Map}
         *            user options
         * @return true if field is valid
         */
        _validateField: function(field, options, skipAjaxValidation) {
            if (!field.attr("id"))
                $.error("jQueryValidate: an ID attribute is required for this field: " + field.attr("name") + " class:" +
                field.attr("class"));

            var rulesParsing = field.attr('class');
            var getRules = /validate\[(.*)\]/.exec(rulesParsing);
            if (!getRules)
                return false;
            var str = getRules[1];
            var rules = str.split(/\[|,|\]/);

            // true if we ran the ajax validation, tells the logic to stop messing with prompts
            var isAjaxValidator = false;
            var fieldName = field.attr("name");
            var promptText = "";
            var required = false;
            options.isError = false;
            options.showArrow = true;

            for (var i = 0; i < rules.length; i++) {

                var errorMsg = undefined;
                switch (rules[i]) {

                    case "required":
                        required = true;
                        errorMsg = methods._required(field, rules, i, options);
                        break;
                    case "custom":
                        errorMsg = methods._customRegex(field, rules, i, options);
                        break;
                    case "groupRequired":
                        // Check is its the first of group, if not, reload validation with first field
                        // AND continue normal validation on present field
                        var classGroup = "[class*=" +rules[i + 1] +"]"; 
                        var firstOfGroup = field.closest("form").find(classGroup).eq(0);
                        if(firstOfGroup[0] != field[0]){
                            methods._validateField(firstOfGroup, options, skipAjaxValidation)
                            options.showArrow = true;
                            continue;
                        };
                        errorMsg = methods._groupRequired(field, rules, i, options);
                        if(errorMsg) required = true;
                        options.showArrow = false;
                        break;
                    case "ajax":
                        // ajax has its own prompts handling technique
                        if(!skipAjaxValidation){
                            methods._ajax(field, rules, i, options);
                            isAjaxValidator = true;
                        }
                        break;
                    case "minSize":
                        errorMsg = methods._minSize(field, rules, i, options);
                        break;
                    case "maxSize":
                        errorMsg = methods._maxSize(field, rules, i, options);
                        break;
                    case "min":
                        errorMsg = methods._min(field, rules, i, options);
                        break;
                    case "max":
                        errorMsg = methods._max(field, rules, i, options);
                        break;
                    case "past":
                        errorMsg = methods._past(field, rules, i, options);
                        break;
                    case "future":
                        errorMsg = methods._future(field, rules, i, options);
                        break;
                    case "dateRange":
                        errorMsg = methods._dateRange(field, rules, i, options);
                        field = $($("input[name='" + fieldName + "']"));
                        break;
                    case "dateTimeRange":
                        errorMsg = methods._dateTimeRange(field, rules, i, options);
                        field = $($("input[name='" + fieldName + "']"));
                        break;
                    case "maxCheckbox":
                        errorMsg = methods._maxCheckbox(field, rules, i, options);
                        field = $($("input[name='" + fieldName + "']"));
                        break;
                    case "minCheckbox":
                        errorMsg = methods._minCheckbox(field, rules, i, options);
                        field = $($("input[name='" + fieldName + "']"));
                        break;
                    case "equals":
                        errorMsg = methods._equals(field, rules, i, options);
                        break;
                    case "funcCall":
                        errorMsg = methods._funcCall(field, rules, i, options);
                        break;

                    default:
                    //$.error("jQueryValidator rule not found"+rules[i]);
                }
                if (errorMsg !== undefined) {
                    promptText += errorMsg + "<br/>";
                    options.isError = true;
                    
                }

            }
            // If the rules required is not added, an empty field is not validated
            if(!required){
                if(field.val() == "") options.isError = false;
            }           

            // Hack for radio/checkbox group button, the validation go into the
            // first radio/checkbox of the group
            var fieldType = field.attr("type");

            if ((fieldType == "radio" || fieldType == "checkbox") && $("input[name='" + fieldName + "']").size() > 1) {
                field = $($("input[name='" + fieldName + "'][type!=hidden]:first"));
                options.showArrow = false;
            }
            if (fieldType == "text" && $("input[name='" + fieldName + "']").size() > 1) {
                field = $($("input[name='" + fieldName + "'][type!=hidden]:first"));
                options.showArrow = false;
            }

            if (options.isError){
                
                methods._showPrompt(field, promptText, "", false, options);
            }else{
                if (!isAjaxValidator) methods._closePrompt(field);
            }
            field.trigger("jqv.field.result", [field, options.isError, promptText]);
            return options.isError;
        },
        /**
         * Required validation
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return an error string if validation failed
         */
        _required: function(field, rules, i, options) {
            switch (field.attr("type")) {
                case "text":
                case "password":
                case "textarea":
                case "file":
                default:
                    if (!field.val())
                        return options.allrules[rules[i]].alertText;
                    break;
                case "radio":
                case "checkbox":
                    var name = field.attr("name");
                    if ($("input[name='" + name + "']:checked").size() == 0) {
                        if ($("input[name='" + name + "']").size() == 1)
                            return options.allrules[rules[i]].alertTextCheckboxe;
                        else
                            return options.allrules[rules[i]].alertTextCheckboxMultiple;
                    }
                    break;
                case "dateTimeRange":
                case "dateRange":
                    var name = field.attr("name");
                    var dateRangeFields = $("input[name='" + name + "']");
                    if (!dateRangeFields[0].val() || !dateRangeFields[1].val())
                        return options.allrules[rules[i]].alertTextDateRange;
                    break;
                // required for <select>
                case "select-one":
                    // added by paul@kinetek.net for select boxes, Thank you
                    if (!field.val())
                        return options.allrules[rules[i]].alertText;
                    break;
                case "select-multiple":
                    // added by paul@kinetek.net for select boxes, Thank you
                    if (!field.find("option:selected").val())
                        return options.allrules[rules[i]].alertText;
                    break;
            }
        },
        /**
         * Validate that 1 from the group field is required
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return an error string if validation failed
         */
        _groupRequired: function(field, rules, i, options) {
            var classGroup = "[class*=" +rules[i + 1] +"]";
            var isValid = false;
            // Check all fields from the group
            field.closest("form").find(classGroup).each(function(){
                if(!methods._required($(this), rules, i, options)){
                    isValid = true;
                    return false;
                }
            })
            
            if(!isValid) return options.allrules[rules[i]].alertText;
        },
        /**
         * Validate Regex rules
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return an error string if validation failed
         */
        _customRegex: function(field, rules, i, options) {
            var customRule = rules[i + 1];
            var rule = options.allrules[customRule];
            if(!rule) {
                alert("jqv:custom rule not found "+customRule);
                return;
            }
            
            var ex=rule.regex;
            if(!ex) {
                alert("jqv:custom regex not found "+customRule);
                return;
            }
            var pattern = new RegExp(ex);

            if (!pattern.test(field.val()))
                return options.allrules[customRule].alertText;
        },
        /**
         * Validate custom function outside of the engine scope
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return an error string if validation failed
         */
        _funcCall: function(field, rules, i, options) {
            var functionName = rules[i + 1];
            var fn = window[functionName];
            if (typeof(fn) == 'function')
                return fn(field, rules, i, options);

        },
        /**
         * Field match
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return an error string if validation failed
         */
        _equals: function(field, rules, i, options) {
            var equalsField = rules[i + 1];

            if (field.val() != $("#" + equalsField).val())
                return options.allrules.equals.alertText;
        },
        /**
         * Check the maximum size (in characters)
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return an error string if validation failed
         */
        _maxSize: function(field, rules, i, options) {
            var max = rules[i + 1];
            var len = field.val().length;

            if (len > max) {
                var rule = options.allrules.maxSize;
                return rule.alertText + max + rule.alertText2;
            }
        },
        /**
         * Check the minimum size (in characters)
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return an error string if validation failed
         */
        _minSize: function(field, rules, i, options) {
            var min = rules[i + 1];
            var len = field.val().length;

            if (len < min) {
                var rule = options.allrules.minSize;
                return rule.alertText + min + rule.alertText2;
            }
        },
        /**
         * Check number minimum value
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return an error string if validation failed
         */
        _min: function(field, rules, i, options) {
            var min = parseFloat(rules[i + 1]);
            var len = parseFloat(field.val());

            if (len < min) {
                var rule = options.allrules.min;
                if (rule.alertText2) return rule.alertText + min + rule.alertText2;
                return rule.alertText + min;
            }
        },
        /**
         * Check number maximum value
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return an error string if validation failed
         */
        _max: function(field, rules, i, options) {
            var max = parseFloat(rules[i + 1]);
            var len = parseFloat(field.val());

            if (len >max ) {
                var rule = options.allrules.max;
                if (rule.alertText2) return rule.alertText + max + rule.alertText2;
                //orefalo: to review, also do the translations
                return rule.alertText + max;
            }
        },
        /**
         * Checks date is in the past
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return an error string if validation failed
         */
        _past: function(field, rules, i, options) {

            var p=rules[i + 1];
            var pdate = (p.toLowerCase() == "now")? new Date():methods._parseDate(p);
            var vdate = methods._parseDate(field.val());

            if (vdate < pdate ) {
                var rule = options.allrules.past;
                if (rule.alertText2) return rule.alertText + methods._dateToString(pdate) + rule.alertText2;
                return rule.alertText + methods._dateToString(pdate);
            }
        },
        /**
         * Checks date is in the future
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return an error string if validation failed
         */
        _future: function(field, rules, i, options) {

            var p=rules[i + 1];
            var pdate = (p.toLowerCase() == "now")? new Date():methods._parseDate(p);
            var vdate = methods._parseDate(field.val());

            if (vdate > pdate ) {
                var rule = options.allrules.future;
                if (rule.alertText2) return rule.alertText + methods._dateToString(pdate) + rule.alertText2;
                return rule.alertText + methods._dateToString(pdate);
            }
        },
        /**
        * Checks date range
        *
        * @param {jqObject} field name
        * @param {Array[String]} rules
        * @param {int} i rules index
        * @param {Map}
        *            user options
        * @return an error string if validation failed
        */
        _isDate: function (value) {
            var dateRegEx = new RegExp(/^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])$|^(?:(?:(?:0?[13578]|1[02])(\/|-)31)|(?:(?:0?[1,3-9]|1[0-2])(\/|-)(?:29|30)))(\/|-)(?:[1-9]\d\d\d|\d[1-9]\d\d|\d\d[1-9]\d|\d\d\d[1-9])$|^(?:(?:0?[1-9]|1[0-2])(\/|-)(?:0?[1-9]|1\d|2[0-8]))(\/|-)(?:[1-9]\d\d\d|\d[1-9]\d\d|\d\d[1-9]\d|\d\d\d[1-9])$|^(0?2(\/|-)29)(\/|-)(?:(?:0[48]00|[13579][26]00|[2468][048]00)|(?:\d\d)?(?:0[48]|[2468][048]|[13579][26]))$/);
            if (dateRegEx.test(value)) {
                return true;
            }
            return false;
        },
        _isDateTime: function (value){
            var dateTimeRegEx = new RegExp(/^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])\s+(1[012]|0?[1-9]){1}:(0?[1-5]|[0-6][0-9]){1}:(0?[0-6]|[0-6][0-9]){1}\s+(am|pm|AM|PM){1}$|^(?:(?:(?:0?[13578]|1[02])(\/|-)31)|(?:(?:0?[1,3-9]|1[0-2])(\/|-)(?:29|30)))(\/|-)(?:[1-9]\d\d\d|\d[1-9]\d\d|\d\d[1-9]\d|\d\d\d[1-9])$|^((1[012]|0?[1-9]){1}\/(0?[1-9]|[12][0-9]|3[01]){1}\/\d{2,4}\s+(1[012]|0?[1-9]){1}:(0?[1-5]|[0-6][0-9]){1}:(0?[0-6]|[0-6][0-9]){1}\s+(am|pm|AM|PM){1})$/);
            if (dateTimeRegEx.test(value)) {
                return true;
            }
            return false;
        },
        //Checks if the start date is before the end date
        //returns true if end is later than start
        _dateCompare: function (start, end) {
            return (new Date(start.toString()) < new Date(end.toString()));
        },
        _dateRange: function (field, rules, i, options) {
            var name = field.attr("name");
            //if there are 2 fields to compare
            if ($("input[name='" + name + "']").length == 2) {
                var inDate1 = $("input[name='" + name + "']")[0].value;
                var inDate2 = $("input[name='" + name + "']")[1].value;
                if (methods._isDate(inDate1) && methods._isDate(inDate2)) {
                    if (!methods._dateCompare(inDate1, inDate2)) {
                        return "* Invalid Date Range";
                    }
                } else {
                    return "* Invalid Date Range";
                }
            } else {
                return "* Invalid Date Range";
            }
        },
        _dateTimeRange: function (field, rules, i, options) {
            var name = field.attr("name");
            //if there are 2 fields to compare
            if ($("input[name='" + name + "']").length == 2) {
                var inDate1 = $("input[name='" + name + "']")[0].value;
                var inDate2 = $("input[name='" + name + "']")[1].value;
                if (methods._isDateTime(inDate1) && methods._isDateTime(inDate2)) {
                    if (!methods._dateCompare(inDate1, inDate2)) {
                        return "* Invalid Date Time Range";
                    }
                } else {
                    return "* Invalid Date Time Range";
                }
            } else {
                return "* Invalid Date Time Range";
            }
        },
        /**
         * Max number of checkbox selected
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return an error string if validation failed
         */
        _maxCheckbox: function(field, rules, i, options) {

            var nbCheck = rules[i + 1];
            var groupname = field.attr("name");
            var groupSize = $("input[name='" + groupname + "']:checked").size();
            if (groupSize > nbCheck) {
                options.showArrow = false;
                if (options.allrules.maxCheckbox.alertText2) return options.allrules.maxCheckbox.alertText + " " + nbCheck + " " + options.allrules.maxCheckbox.alertText2;
                return options.allrules.maxCheckbox.alertText;
            }
        },
        /**
         * Min number of checkbox selected
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return an error string if validation failed
         */
        _minCheckbox: function(field, rules, i, options) {

            var nbCheck = rules[i + 1];
            var groupname = field.attr("name");
            var groupSize = $("input[name='" + groupname + "']:checked").size();
            if (groupSize < nbCheck) {
                options.showArrow = false;
                return options.allrules.minCheckbox.alertText + " " + nbCheck + " " +
                options.allrules.minCheckbox.alertText2;
            }
        },
        /**
         * Ajax field validation
         *
         * @param {jqObject} field
         * @param {Array[String]} rules
         * @param {int} i rules index
         * @param {Map}
         *            user options
         * @return nothing! the ajax validator handles the prompts itself
         */
        _ajax: function(field, rules, i, options) {
            
            
            var errorSelector = rules[i + 1];
            var rule = options.allrules[errorSelector];
            var extraData = rule.extraData;
            var extraDataDynamic = rule.extraDataDynamic;

            if (!extraData)
                extraData = "";

            if (extraDataDynamic) {
              var tmpData = [];
              var domIds = String(extraDataDynamic).split(",");
              for (var i = 0; i < domIds.length; i++) {
                var id = domIds[i];
                if ($(id).length) {
                  var inputValue = field.closest("form").find(id).val();
                  var keyValue = id.replace('#', '') + '=' + escape(inputValue);
                  tmpData.push(keyValue);
                }
              }
              extraDataDynamic = tmpData.join("&");
            } else {
              extraDataDynamic = "";              
            }
                                
            if (!options.isError) {
                $.ajax({
                    type: "GET",
                    url: rule.url,
                    cache: false,
                    dataType: "json",
                    data: "fieldId=" + field.attr("id") + "&fieldValue=" + field.val() + "&extraData=" + extraData + "&" + extraDataDynamic,
                    field: field,
                    rule: rule,
                    methods: methods,
                    options: options,
                    beforeSend: function() {
                        // build the loading prompt
                        var loadingText = rule.alertTextLoad;
                        if (loadingText)
                            methods._showPrompt(field, loadingText, "load", true, options);
                    },
                    error: function(data, transport) {
                        methods._ajaxError(data, transport);
                    },
                    success: function(json) {
                        
                        // asynchronously called on success, data is the json answer from the server
                        var errorFieldId = json[0];
                        var errorField = $($("#" + errorFieldId)[0]);
                        // make sure we found the element
                        if (errorField.length == 1) {
                            var status = json[1];
                            // read the optional msg from the server
                            var msg = json[2];
                            if (!status) {
                                // Houston we got a problem - display an red prompt
                                options.ajaxValidCache[errorFieldId] = false;
                                options.isError = true;

                                // resolve the msg prompt
                                if(msg) {
                                    if (options.allrules[msg]) {
                                        var txt = options.allrules[msg].alertText;
                                        if (txt)
                                            msg = txt;
                                    }
                                }
                                else
                                    msg = rule.alertText;
                                
                                methods._showPrompt(errorField, msg, "", true, options);
                            } else {
                                if (options.ajaxValidCache[errorFieldId] !== undefined)
                                    options.ajaxValidCache[errorFieldId] = true;

                                // resolves the msg prompt
                                if(msg) {
                                    if (options.allrules[msg]) {
                                        var txt = options.allrules[msg].alertTextOk;
                                        if (txt)
                                            msg = txt;
                                    }
                                }
                                else
                                    msg = rule.alertTextOk;                                

                                // see if we should display a green prompt
                                if (msg)
                                    methods._showPrompt(errorField, msg, "pass", true, options);
                                else
                                    methods._closePrompt(errorField);
                            }
                        }
                    }
                });
            }
        },
        /**
         * Common method to handle ajax errors
         *
         * @param {Object} data
         * @param {Object} transport
         */
        _ajaxError: function(data, transport) {
            if(data.status == 0 && transport == null)
                alert("The page is not served from a server! ajax call failed");
            else if(typeof console != "undefined")
                console.log("Ajax error: " + data.status + " " + transport);
        },
        /**
         * date -> string
         *
         * @param {Object} date
         */
        _dateToString: function(date) {

            return date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate();
        },
        /**
         * Parses an ISO date
         * @param {String} d
         */
        _parseDate: function(d) {

            var dateParts = d.split("-");
            if(dateParts==d)
                dateParts = d.split("/");
            return new Date(dateParts[0], (dateParts[1] - 1) ,dateParts[2]);
        },
        /**
         * Builds or updates a prompt with the given information
         *
         * @param {jqObject} field
         * @param {String} promptText html text to display type
         * @param {String} type the type of bubble: 'pass' (green), 'load' (black) anything else (red)
         * @param {boolean} ajaxed - use to mark fields than being validated with ajax
         * @param {Map} options user options
         */
        _showPrompt: function(field, promptText, type, ajaxed, options, ajaxform) {
            var prompt = methods._getPrompt(field);
            // The ajax submit errors are not see has an error in the form,
            // When the form errors are returned, the engine see 2 bubbles, but those are ebing closed by the engine at the same time
            // Because no error was found befor submitting
            if(ajaxform) prompt = false;
            if (prompt)
                methods._updatePrompt(field, prompt, promptText, type, ajaxed, options);
            else
                methods._buildPrompt(field, promptText, type, ajaxed, options);
        },
        /**
         * Builds and shades a prompt for the given field.
         *
         * @param {jqObject} field
         * @param {String} promptText html text to display type
         * @param {String} type the type of bubble: 'pass' (green), 'load' (black) anything else (red)
         * @param {boolean} ajaxed - use to mark fields than being validated with ajax
         * @param {Map} options user options
         */
        _buildPrompt: function(field, promptText, type, ajaxed, options) {

            // create the prompt
            var prompt = $('<div>');
            prompt.addClass(methods._getClassName(field.attr("id")) + "formError");
            // add a class name to identify the parent form of the prompt
            if(field.is(":input")) prompt.addClass("parentForm"+methods._getClassName(field.parents('form').attr("id")));
            prompt.addClass("formError");

            switch (type) {
                case "pass":
                    prompt.addClass("greenPopup");
                    break;
                case "load":
                    prompt.addClass("blackPopup");
            }
            if (ajaxed)
                prompt.addClass("ajaxed");

            // create the prompt content
            var promptContent = $('<div>').addClass("formErrorContent").html(promptText).appendTo(prompt);
            // create the css arrow pointing at the field
            // note that there is no triangle on max-checkbox and radio
            if (options.showArrow) {
                var arrow = $('<div>').addClass("formErrorArrow");

                switch (options.promptPosition) {
                    case "bottomLeft":
                    case "bottomRight":
                        prompt.find(".formErrorContent").before(arrow);
                        arrow.addClass("formErrorArrowBottom").html('<div class="line1"><!-- --></div><div class="line2"><!-- --></div><div class="line3"><!-- --></div><div class="line4"><!-- --></div><div class="line5"><!-- --></div><div class="line6"><!-- --></div><div class="line7"><!-- --></div><div class="line8"><!-- --></div><div class="line9"><!-- --></div><div class="line10"><!-- --></div>');
                        break;
                    case "topLeft":
                    case "topRight":
                        arrow.html('<div class="line10"><!-- --></div><div class="line9"><!-- --></div><div class="line8"><!-- --></div><div class="line7"><!-- --></div><div class="line6"><!-- --></div><div class="line5"><!-- --></div><div class="line4"><!-- --></div><div class="line3"><!-- --></div><div class="line2"><!-- --></div><div class="line1"><!-- --></div>');
                        prompt.append(arrow);
                        break;
                }
            }

            //Cedric: Needed if a container is in position:relative
            // insert prompt in the form or in the overflown container?
            if (options.isOverflown)
                field.before(prompt);
            else
               $("body").append(prompt);

            var pos = methods._calculatePosition(field, prompt, options);
            prompt.css({
                "top": pos.callerTopPosition,
                "left": pos.callerleftPosition,
                "marginTop": pos.marginTopSize,
                "opacity": 0
            });

            return prompt.animate({
                "opacity": 0.87
            });

        },
        /**
         * Updates the prompt text field - the field for which the prompt
         * @param {jqObject} field
         * @param {String} promptText html text to display type
         * @param {String} type the type of bubble: 'pass' (green), 'load' (black) anything else (red)
         * @param {boolean} ajaxed - use to mark fields than being validated with ajax
         * @param {Map} options user options
         */
        _updatePrompt: function(field, prompt, promptText, type, ajaxed, options) {
            
            if (prompt) {
                if (type == "pass")
                    prompt.addClass("greenPopup");
                else
                    prompt.removeClass("greenPopup");

                if (type == "load")
                    prompt.addClass("blackPopup");
                else
                    prompt.removeClass("blackPopup");

                if (ajaxed)
                    prompt.addClass("ajaxed");
                else
                    prompt.removeClass("ajaxed");

                prompt.find(".formErrorContent").html(promptText);

                var pos = methods._calculatePosition(field, prompt, options);
                prompt.animate({
                    "top": pos.callerTopPosition,
                    "marginTop": pos.marginTopSize
                });
            }
        },
        /**
         * Closes the prompt associated with the given field
         *
         * @param {jqObject}
         *            field
         */
        _closePrompt: function(field) {

            var prompt = methods._getPrompt(field);
            if (prompt)
                prompt.fadeTo("fast", 0, function() {
                    prompt.remove();
                });
        },
        closePrompt: function(field) {
            return methods._closePrompt(field);
        },
        /**
         * Returns the error prompt matching the field if any
         *
         * @param {jqObject}
         *            field
         * @return undefined or the error prompt (jqObject)
         */
          _getPrompt: function(field) {
            var className = field.attr("id").replace(":","_") + "formError";
            var match = $("." + methods._escapeExpression(className))[0];
            if (match)
              return $(match);
          },
         /**
         * Returns the escapade classname
         *
         * @param {selector}
         *            className
         */     
          _escapeExpression: function (selector) {
            return selector.replace(/([#;&,\.\+\*\~':"\!\^$\[\]\(\)=>\|])/g, "\\$1");
          },
        /**
         * Calculates prompt position
         *
         * @param {jqObject}
         *            field
         * @param {jqObject}
         *            the prompt
         * @param {Map}
         *            options
         * @return positions
         */
        _calculatePosition: function(field, promptElmt, options) {

            var promptTopPosition, promptleftPosition, marginTopSize;
            var fieldWidth = field.width();
            var promptHeight = promptElmt.height();

            var overflow = options.isOverflown;
            if (overflow) {
                // is the form contained in an overflown container?
                promptTopPosition = promptleftPosition = 0;
                // compensation for the arrow
                marginTopSize = -promptHeight;
            } else {
                var offset = field.offset();
                promptTopPosition = offset.top;
                promptleftPosition = offset.left;
                marginTopSize = 0;
            }

            switch (options.promptPosition) {

                default:
                case "topRight":
                    if (overflow)
                        // Is the form contained in an overflown container?
                        promptleftPosition += fieldWidth - 30;
                    else {
                        promptleftPosition += fieldWidth - 30;
                        promptTopPosition += -promptHeight -2;
                    }
                    break;
                case "topLeft":
                    promptTopPosition += -promptHeight - 10;
                    break;
                case "centerRight":
                    promptleftPosition += fieldWidth + 13;
                    break;
                case "bottomLeft":
                    promptTopPosition = promptTopPosition + field.height() + 15;
                    break;
                case "bottomRight":
                    promptleftPosition += fieldWidth - 30;
                    promptTopPosition += field.height() + 5;
            }

            return {
                "callerTopPosition": promptTopPosition + "px",
                "callerleftPosition": promptleftPosition + "px",
                "marginTopSize": marginTopSize + "px"
            };
        },
        /**
         * Saves the user options and variables in the form.data
         *
         * @param {jqObject}
         *            form - the form where the user option should be saved
         * @param {Map}
         *            options - the user options
         * @return the user options (extended from the defaults)
         */
        _saveOptions: function(form, options) {

            // is there a language localisation ?
            if ($.validationEngineLanguage)
                var allRules = $.validationEngineLanguage.allRules;
            else
                $.error("jQuery.validationEngine rules are not loaded, plz add localization files to the page");
            // --- Internals DO NOT TOUCH or OVERLOAD ---
            // validation rules and i18
            $.validationEngine.defaults.allrules = allRules;
            
            var userOptions = $.extend({},$.validationEngine.defaults, options);

            form.data('jqv', userOptions);
            return userOptions;
        },
        
        /**
         * Removes forbidden characters from class name
         * @param {String} className
         */
        _getClassName: function(className) {
            return className.replace(":","_").replace(".","_");
        }
    };

    /**
     * Plugin entry point.
     * You may pass an action as a parameter or a list of options.
     * if none, the init and attach methods are being called.
     * Remember: if you pass options, the attached method is NOT called automatically
     *
     * @param {String}
     *            method (optional) action
     */
    $.fn.validationEngine = function(method) {

        var form = $(this);
          if(!form[0]) return false;  // stop here if the form does not exist
          
        if (typeof(method) == 'string' && method.charAt(0) != '_' && methods[method]) {

            // make sure init is called once
            if(method != "showPrompt" && method != "hidePrompt" && method != "hide" && method != "hideAll") 
                methods.init.apply(form);

            return methods[method].apply(form, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method == 'object' || !method) {
            // default constructor with or without arguments
            
            methods.init.apply(form, arguments);
            return methods.attach.apply(form);
        } else {
            $.error('Method ' + method + ' does not exist in jQuery.validationEngine');
        }
    };
    // LEAK GLOBAL OPTIONS
    $.validationEngine= {defaults:{

        // Name of the event triggering field validation
        validationEventTrigger: "blur",
        // Automatically scroll viewport to the first error
        scroll: true,
        // Opening box position, possible locations are: topLeft,
        // topRight, bottomLeft, centerRight, bottomRight
        promptPosition: "topRight",
        bindMethod:"bind",
        // internal, automatically set to true when it parse a _ajax rule
        inlineAjax: false,
        // if set to true, the form data is sent asynchronously via ajax to the form.action url (get)
        ajaxFormValidation: false,
        // Ajax form validation callback method: boolean onComplete(form, status, errors, options)
        // retuns false if the form.submit event needs to be canceled.
        ajaxFormValidationURL: false,
        // The url to send the submit ajax validation (default to action)
        onAjaxFormComplete: $.noop,
        // called right before the ajax call, may return false to cancel
        onBeforeAjaxFormValidation: $.noop,
        // Stops form from submitting and execute function assiciated with it
        onValidationComplete: false,

        // Used when the form is displayed within a scrolling DIV
        isOverflown: false,
        overflownDIV: "",

        // true when form and fields are binded
        binded: false,
        // set to true, when the prompt arrow needs to be displayed
        showArrow: true,
        // did one of the validation fail ? kept global to stop further ajax validations
        isError: false,
        // Caches field validation status, typically only bad status are created.
        // the array is used during ajax form validation to detect issues early and prevent an expensive submit
        ajaxValidCache: {}

    }}
    
})(jQuery);


(function($){
    $.fn.validationEngineLanguage = function(){
    };
    $.validationEngineLanguage = {
        newLang: function(){
            $.validationEngineLanguage.allRules = {
                "required": { // Add your regex rules here, you can take telephone as an example
                    "regex": "none",
                    "alertText": "* Este campo es requerido",
                    "alertTextCheckboxMultiple": "* Por favor selecciona una opción",
                    "alertTextCheckboxe": "* Este checkbox está requerido"
                },
                "minSize": {
                    "regex": "none",
                    "alertText": "* Mínimo de ",
                    "alertText2": " caracteres autorizados"
                },
                "groupRequired": {
                    "regex": "none",
                    "alertText": "* You must fill one of the following fields"
                },
                "maxSize": {
                    "regex": "none",
                    "alertText": "* Máximo de ",
                    "alertText2": " caracteres autorizados"
                },
                "min": {
                    "regex": "none",
                    "alertText": "* Valor mínimo es "
                },
                "max": {
                    "regex": "none",
                    "alertText": "* Valor máximo es "
                },
                "past": {
                    "regex": "none",
                    "alertText": "* Fecha anterior a "
                },
                "future": {
                    "regex": "none",
                    "alertText": "* Fecha posterior a "
                },  
                "maxCheckbox": {
                    "regex": "none",
                    "alertText": "* Se ha excedido el número de opciones permitidas"
                },
                "minCheckbox": {
                    "regex": "none",
                    "alertText": "* Por favor seleccione ",
                    "alertText2": " opciones"
                },
                "equals": {
                    "regex": "none",
                    "alertText": "* Los campos no coinciden"
                },
                "phone": {
                    // credit: jquery.h5validate.js / orefalo
                    "regex": /^([\+][0-9]{1,3}[ \.\-])?([\(]{1}[0-9]{2,6}[\)])?([0-9 \.\-\/]{3,20})((x|ext|extension)[ ]?[0-9]{1,4})?$/,
                    "alertText": "* Número de teléfono inválido"
                },
                "email": {
                    // Shamelessly lifted from Scott Gonzalez via the Bassistance Validation plugin http://projects.scottsplayground.com/email_address_validation/
                    "regex": /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
                    "alertText": "* Correo inválido"
                },
                "integer": {
                    "regex": /^[\-\+]?\d+$/,
                    "alertText": "* No es un valor entero válido"
                },
                "number": {
                    // Number, including positive, negative, and floating decimal. credit: orefalo
                    "regex": /^[\-\+]?(([0-9]+)([\.,]([0-9]+))?|([\.,]([0-9]+))?)$/,
                    "alertText": "* No es un valor decimal válido"
                },
                "date": {
                    "regex": /^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])$/,
                    "alertText": "* Fecha inválida, por favor utilize el formato AAAA-MM-DD"
                },
                "ipv4": {
                    "regex": /^((([01]?[0-9]{1,2})|(2[0-4][0-9])|(25[0-5]))[.]){3}(([0-1]?[0-9]{1,2})|(2[0-4][0-9])|(25[0-5]))$/,
                    "alertText": "* Direccion IP inválida"
                },
                "url": {
                    "regex": /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i,
                    "alertText": "* URL Inválida"
                },
                "onlyNumberSp": {
                    "regex": /^[0-9\ ]+$/,
                    "alertText": "* Sólo números"
                },
                "onlyLetterSp": {
                    "regex": /^[a-zA-Z\ \']+$/,
                    "alertText": "* Sólo letras"
                },
                "onlyLetterNumber": {
                    "regex": /^[0-9a-zA-Z]+$/,
                    "alertText": "* No se permiten caracteres especiales"
                },
                // --- CUSTOM RULES -- Those are specific to the demos, they can be removed or changed to your likings
                "ajaxUserCall": {
                    "url": "ajaxValidateFieldUser",
                    // you may want to pass extra data on the ajax call
                    "extraData": "name=eric",
                    "alertTextLoad": "* Cargando, espere por favor",
                    "alertText": "* Este nombre de usuario ya se encuentra usado"
                },
                "ajaxNameCall": {
                    // remote json service location
                    "url": "ajaxValidateFieldName",
                    // error
                    "alertText": "* Este nombre ya se encuentra usado",
                    // if you provide an "alertTextOk", it will show as a green prompt when the field validates
                    "alertTextOk": "* Este nombre está disponible",
                    // speaks by itself
                    "alertTextLoad": "* Cargando, espere por favor"
                },
                "validate2fields": {
                    "alertText": "* Por favor entrar HELLO"
                }
            };
            
        }
    };
    $.validationEngineLanguage.newLang();
})(jQuery);




