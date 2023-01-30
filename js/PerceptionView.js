import Adapt from 'core/js/adapt';
import a11y from 'core/js/a11y';
import QuestionView from 'core/js/views/questionView';

export default class PerceptionView extends QuestionView {

  events() {
    return {
      'click .perception-item__option': 'onItemSelected',
      'click .perception__controls': 'onNavigationClicked',
      'click .perception__progress': 'onProgressClicked'
    };
  }

  initialize(...args) {
    super.initialize(...args);
  }

  resetQuestionOnRevisit() {
    this.setAllItemsEnabled(true);
    this.resetQuestion();
  }

  setupQuestion() {
    this.model.setupRandomisation();
  }

  disableQuestion() {
    this.setAllItemsEnabled(false);
  }

  enableQuestion() {
    this.setAllItemsEnabled(true);
  }

  setAllItemsEnabled(isEnabled) {
    _.each(this.model.get('_items'), function(item, index){
      const $item = this.$('.perception-item').eq(index);

      _.each(this.model.get('_options'), function(item, index){
        const $option = $item.find('.perception-item__option');

        if (isEnabled) {
          $option.removeClass('is-disabled');
        } else {
          $option.addClass('is-disabled');
        }
      }, this);

    }, this);
  }

  onQuestionRendered() {
    this.setAriaLabels();
    this.setupPerception();

    this.listenTo(Adapt, 'device:resize', this.resizeControl, this);

    this.setReadyStatus();

    if (!this.model.get("_isSubmitted")) return;
    this.showMarking();
    this.disableQuestion();
  }

  setAriaLabels() {
    const ariaLabels = Adapt.course.get('_globals')._accessibility._ariaLabels;
    const shouldShowMarking = !this.model.isInteractive() && this.model.get('_canShowMarking');
    _.each(this.model.get('_items'), function(item, index){
      const $item = this.$('.perception-item').eq(index);
      _.each(this.model.get('_options'), function(option, index){
        const $option = $item.find('.option-'+index);
        const correctOption = index === (item._correctOption -  1);
        const isSelected = index === item._isSelected;
        const ariaLabel= !shouldShowMarking ? option.text : `${correctOption ? ariaLabels.correct : ariaLabels.incorrect}, ${isSelected ? ariaLabels.selectedAnswer : ariaLabels.unselectedAnswer}. ${option.text}`;
        $option.attr('aria-label', ariaLabel);
      }, this);
    }, this);
  }

  onItemSelected(event) {
    if (this.model.get('_isEnabled') && !this.model.get('_isSubmitted')){
      const selectedItemObject = this.model.get('_items')[$(event.currentTarget).attr('id')];
      const selectedOptionObject = this.model.get('_options')[$(event.currentTarget).index()];
      this.toggleItemSelected(selectedItemObject, selectedOptionObject, event);
    }

    this.model.checkCanSubmit();
  }

  toggleItemSelected(item, option, clickEvent) {
    const selectedItems = this.model.get('_selectedItems');

    const itemIndex = _.indexOf(this.model.get('_items'), item),
      $item = this.$('.perception-item').eq(itemIndex);

    const optionIndex = _.indexOf(this.model.get('_options'), option),
      $option = $(clickEvent.currentTarget);

    this.deselectAllOptions($item);

    $option.addClass('is-selected');

    item._isSelected = optionIndex;
    this.model.set('_selectedItems', selectedItems);

    if (this.model.get('_stage') == this.model.get('_items').length - 1) return;

    this.setStage(this.model.get('_stage')+1);

    this.playAudio();
  }

  // Blank method to add functionality for when the user cannot submit
  // Could be used for a popup or explanation dialog/hint
  onCannotSubmit() {}

  // This is important and should give the user feedback on how they answered the question
  // Normally done through ticks and crosses by adding classes
  showMarking() {
    if (!this.model.get('_canShowMarking')) return;

    this.$('.perception__progress').addClass('is-enabled');

    _.each(this.model.get('_items'), function(item, i) {
      const $item = this.$('.perception-item').eq(i);
      const $option = $item.find('.perception-item__option');
      a11y.toggleEnabled($option, false);
      $item.removeClass('is-correct is-incorrect').addClass(item._isCorrect ? 'is-correct' : 'is-incorrect');

      const $progressItem = this.$('.perception__progress').eq(i);
      $progressItem.removeClass('is-correct is-incorrect').addClass(item._isCorrect ? 'is-correct' : 'is-incorrect');
    }, this);
    this.setAriaLabels();
  }

  // Used by the question view to reset the look and feel of the component.
  resetQuestion() {
    this.deselectAllItems();
    this.resetItems();

    _.each(this.model.get('_items'), function(item, index) {
      const $item = this.$('.perception-item').eq(index);
      this.deselectAllOptions($item);
      item._isCorrect = false;
    }, this);

    this.setStage(0);
  }

  deselectAllItems() {
    a11y.toggleAccessible(this.$el, true);
    this.model.deselectAllItems();
  }

  deselectAllOptions($item) {
    _.each(this.model.get('_options'), function(item, index){
      const $option = $item.find('.perception-item__option');
      $option.removeClass('is-selected');
    }, this);
  }

  resetItems() {
    this.$('.perception-item__option').removeClass('is-selected');
    this.$('.perception-item').removeClass('is-correct is-incorrect');
    this.model.resetItems();
  }

  showCorrectAnswer() {
    _.each(this.model.get('_items'), function(item, index) {
      this.setOptionsSelected(index, item._correctOption - 1);
    }, this);
  }

  setOptionsSelected(item, option) {
    const $item = this.$('.perception-item').eq(item);
    const $option = $item.find('.perception-item__option').eq(option);

    this.deselectAllOptions($item);

    $option.addClass('is-selected');
  }

  hideCorrectAnswer() {
    _.each(this.model.get('_items'), function(item, index) {
      this.setOptionsSelected(index, this.model.get('_userAnswer')[item._index]);
    }, this);
  }

  setupPerception() {
    this.model.set('_marginDir', 'left');
    if (Adapt.config.get('_defaultDirection') == 'rtl') {
      this.model.set('_marginDir', 'right');
    }

    this.model.set('_itemCount', this.model.get('_items').length);

    // Hide progress indicators if only 1 item
    if (this.model.get('_itemCount') === 1){
      this.$('.perception__indicators').addClass('u-display-none');
    }

    a11y.toggleAccessible(this.$('.perception-item__option'), false);

    this.setStage(0, true);

    this.calculateWidths();
  }

  calculateWidths() {
    const slideWidth = this.$('.perception__container').width();
    const slideCount = this.model.get('_itemCount');
    const fullSlideWidth = slideWidth * slideCount;

    this.$('.perception-item').width(slideWidth);
    this.$('.perception__slider').width(fullSlideWidth);

    const stage = this.model.get('_stage');
    const margin = -(stage * slideWidth);

    this.$('.perception__slider').css(('margin-' + this.model.get('_marginDir')), margin);

    this.model.set('_finalItemLeft', fullSlideWidth - slideWidth);
  }

  resizeControl() {
    this.calculateWidths();
  }

  moveSliderToIndex(itemIndex, animate, callback) {
    const movementSize = this.$('.perception__container').width();
    let marginDir = {};
    if (animate && !Adapt.config.get('_disableAnimation')) {
      marginDir['margin-' + this.model.get('_marginDir')] = -(movementSize * itemIndex);
      this.$('.perception__slider').velocity("stop", true).velocity(marginDir);
    } else {
      marginDir['margin-' + this.model.get('_marginDir')] = -(movementSize * itemIndex);
      this.$('.perception__slider').css(marginDir);
      callback();
    }

    // Accessibility
    // reset
    a11y.toggleAccessible(this.$('.perception-item__option'), false);
    // Enable on current item
    const $item = this.$('.perception-item').eq(itemIndex).find('.perception-item__option');
    a11y.toggleAccessible($item, true);
  }

  setStage(stage, initial) {
    this.model.set('_stage', stage);

    this.$('.perception__progress:visible').removeClass('is-selected').eq(stage).addClass('is-selected');

    this.evaluateNavigation();
    this.moveSliderToIndex(stage, true);
    this.toggleStageAccessibility(stage);
  }

  toggleStageAccessibility(stage) {
    a11y.toggleAccessible(this.$('.perception-item'), false);
    const $item = this.$('.perception-item').eq(stage);
    a11y.toggleAccessible($item, true);
  }

  evaluateNavigation() {
    const currentStage = this.model.get('_stage');
    const itemCount = this.model.get('_items').length;

    const isAtStart = currentStage === 0;
    const isAtEnd = currentStage === itemCount - 1;

    this.$('.perception__control-left').toggleClass('perception__hidden', isAtStart);
    this.$('.perception__control-right').toggleClass('perception__hidden', isAtEnd);
  }

  constrainXPosition(previousLeft, newLeft, deltaX) {
    if (newLeft > 0 && deltaX > 0) {
      newLeft = previousLeft + (deltaX / (newLeft * 0.1));
    }

    const finalItemLeft = this.model.get('_finalItemLeft');
    if (newLeft < -finalItemLeft && deltaX < 0) {
      const distance = Math.abs(newLeft + finalItemLeft);
      newLeft = previousLeft + (deltaX / (distance * 0.1));
    }
    return newLeft;
  }

  getCurrentItem(index) {
    return this.model.get('_items')[index];
  }

  moveElement($element, deltaX) {
    const previousLeft = parseInt($element.css('margin-left'));
    let newLeft = previousLeft + deltaX;

    newLeft = this.constrainXPosition(previousLeft, newLeft, deltaX);
    $element.css(('margin-' + this.model.get('_marginDir')), newLeft + 'px');
  }

  onNavigationClicked(event) {
    let stage = this.model.get('_stage');

    if ($(event.currentTarget).hasClass('perception__control-right')) {
      this.setStage(++stage);
    } else if ($(event.currentTarget).hasClass('perception__control-left')) {
      this.setStage(--stage);
    }

    this.playAudio();
  }

  onProgressClicked(event) {
    event.preventDefault();

    if (!this.model.get("_isSubmitted")) return;

    const clickedIndex = $(event.target).index();
    this.setStage(clickedIndex-1);

    this.playAudio();
  }

  playAudio() {
    if (!Adapt.audio) return;

    const stage = this.model.get('_stage');

    const currentItem = this.getCurrentItem(stage);

    if (!currentItem._audio._src) return;

    if (this.model.has('_audio') && this.model.get('_audio')._isEnabled && Adapt.audio.audioClip[this.model.get('_audio')._channel].status == 1) {
      Adapt.audio.audioClip[this.model.get('_audio')._channel].onscreenID = "";
      Adapt.trigger('audio:playAudio', currentItem._audio._src, this.model.get('_id'), this.model.get('_audio')._channel);
    }
  }
}
