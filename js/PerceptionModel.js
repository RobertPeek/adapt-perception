import QuestionModel from 'core/js/models/questionModel';

export default class PerceptionModel extends QuestionModel {

  init() {
    super.init();

    this.set('_selectedItems', []);

    this.setupQuestionItemIndexes();
  }

  setupQuestionItemIndexes() {
    const items = this.get("_items");
    if (items && items.length > 0) {
      for (let i = 0, l = items.length; i < l; i++) {
        if (items[i]._index === undefined) items[i]._index = i;
      }
    }
  }

  restoreUserAnswers() {
    if (!this.get("_isSubmitted")) return;

    const selectedItems = [];
    const items = this.get("_items");
    const userAnswer = this.get("_userAnswer");
    _.each(items, function(item, index) {
      item._isSelected = userAnswer[item._index];
      if (item._isSelected) {
        selectedItems.push(item);
      }
    });

    this.set("_selectedItems", selectedItems);

    this.setQuestionAsSubmitted();
    this.markQuestion();
    this.setScore();
    this.setupFeedback();
  }

  setupRandomisation() {
    if (this.get('_isRandom') && this.get('_isEnabled')) {
      this.set("_items", _.shuffle(this.get("_items")));
    }
  }

  // check if the user is allowed to submit the question
  canSubmit() {
    let count = 0;

    _.each(this.get('_items'), function(item) {
      if (item._isSelected !== null) {
        count++;
      }
    }, this);

    return (count == this.get('_items').length) ? true : false;
  }

  // This is important for returning or showing the users answer
  // This should preserve the state of the users answers
  storeUserAnswer() {
    const userAnswer = [];
    const items = this.get('_items').slice(0);

    items.sort(function(a, b) {
      return a._index - b._index;
    });

    _.each(items, function(item, index) {
      userAnswer.push(item._isSelected);
    }, this);

    this.set('_userAnswer', userAnswer);
  }

  isCorrect() {
    const numberOfRequiredAnswers = this.get('_items').length;
    let numberOfCorrectAnswers = 0;
    let numberOfIncorrectAnswers = 0;

    _.each(this.get('_items'), function(item, index) {

      if (item._isSelected == (item._correctOption -  1)) {
        numberOfCorrectAnswers ++;
        item._isCorrect = true;
        this.set('_isAtLeastOneCorrectSelection', true);
      }

    }, this);

    this.set('_numberOfCorrectAnswers', numberOfCorrectAnswers);
    this.set('_numberOfRequiredAnswers', numberOfRequiredAnswers);

    // Check if correct answers matches correct items and there are no incorrect selections
    const answeredCorrectly = (numberOfCorrectAnswers === numberOfRequiredAnswers);
    return answeredCorrectly;
  }

  // Sets the score based upon the questionWeight
  // Can be overwritten if the question needs to set the score in a different way
  setScore() {
    const questionWeight = this.get("_questionWeight");
    const answeredCorrectly = this.get('_isCorrect');
    const score = answeredCorrectly ? questionWeight : 0;
    this.set('_score', score);
  }

  setupFeedback() {
    if (this.get('_isCorrect')) {
      this.setupCorrectFeedback();
    } else if (this.isPartlyCorrect()) {
      this.setupPartlyCorrectFeedback();
    } else {
      this.setupIncorrectFeedback();
    }
  }

  isPartlyCorrect() {
    return this.get('_isAtLeastOneCorrectSelection');
  }

  resetUserAnswer() {
    this.set({_userAnswer: []});
  }

  deselectAllItems() {
    _.each(this.get('_items'), function(item) {
      item._isSelected = null;
    }, this);
  }

  resetItems() {
    this.set({
      _selectedItems: [],
      _isAtLeastOneCorrectSelection: false
    });
  }

  /**
  * used by adapt-contrib-spoor to get the user's answers in the format required by the cmi.interactions.n.student_response data field
  * returns the user's answers as a string in the format "1,5,2"
  */
  getResponse() {
    const items = this.get('_items');
    const selectedIndexes = _.pluck(items, '_isSelected');
    let responses = [];

    // indexes are 0-based, we need them to be 1-based for cmi.interactions
    for (let i = 0, count = selectedIndexes.length; i < count; i++) {
      responses.push((i + 1) + "." + (selectedIndexes[i]++)); // convert from 0-based to 1-based counting
    }

    return responses.join('#');
  }

  /**
  * used by adapt-contrib-spoor to get the type of this question in the format required by the cmi.interactions.n.type data field
  */
  getResponseType() {
    return "matching";
  }
}
