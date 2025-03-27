// CardReader Class, which handles loading of the data, filtering and generating the card objects
class CardReader {
    constructor(jsonURL) {
        this.jsonURL = jsonURL; // Where the JSON file is
        this.jsonData = []; // Property to store JSON data
        this.capabilities = []; // Property to store capabilities data
        this.filters = { // Each filter, needs to be handled in appliesFilter method  
            sector: null, 
            aiCapabilities: null,
            grandChallange: null,
            searchText: '', 
            scoreSignificance: null,
            scoreComplexity: null,
            scoreReadiness: null,
        };
    }

    // Fetch the Data as ASYNC 
    async fetchData() {
        try {
            // Fetch JSON data
            const response = await fetch(this.jsonURL);
            const data = await response.json();
            // Handle new data structure format - data.challenges instead of array
            this.jsonData = data.challenges || data;
            
            // Fetch capabilities data
            try {
                const capResponse = await fetch('capabilities.json');
                const capData = await capResponse.json();
                this.capabilities = capData.capabilities || [];
            } catch (capError) {
                console.error('Error fetching or parsing capabilities data:', capError);
            }
        } catch (error) {
            console.error('Error fetching or parsing JSON:', error);
        }
    }

    // Applies the filters we setup 
    applyFilters() {
        // Apply filters to the data
        let filteredData = this.jsonData;

        // Sector Filter
        if (this.filters.sector && this.filters.sector.length > 0) {
            // Apply sector filter
            filteredData = filteredData.filter(item => {
                // Handle sector in data_v2.json format (may contain & and spaces)
                const itemSector = item.sector.toLowerCase();
                return this.filters.sector.some(sector => itemSector.includes(sector));
            });
        }

        // AI Capability Filter
        if (this.filters.aiCapabilities && this.filters.aiCapabilities.length > 0) {
            filteredData = filteredData.filter(item =>
                item.capabilities && item.capabilities.some(cap => 
                    this.filters.aiCapabilities.includes(cap.toLowerCase())
                )
            );
        }

        // Search Filter	
        if (this.filters.searchText) {
            // Apply text search filter to title and description
            const searchText = this.filters.searchText.toLowerCase();
            filteredData = filteredData.filter(item =>
                item.title.toLowerCase().includes(searchText) || item.description.toLowerCase().includes(searchText)
            );
        }

        // Score Significance Filter (replacing Impact)
        if (this.filters.scoreSignificance && this.filters.scoreSignificance.length > 0) {
            filteredData = filteredData.filter(item =>
                item.significance == this.filters.scoreSignificance
            );
        }

        // Score Complexity Filter (replacing AISuitability)
        if (this.filters.scoreComplexity && this.filters.scoreComplexity.length > 0) {
            filteredData = filteredData.filter(item =>
                item.complexity == this.filters.scoreComplexity
            );
        }

        // Score Readiness Filter (replacing Novelty)
        if (this.filters.scoreReadiness && this.filters.scoreReadiness.length > 0) {
            filteredData = filteredData.filter(item =>
                item.readiness == this.filters.scoreReadiness
            );
        }

        // Add more filter conditions as needed

        return filteredData;
    }

    // Load Cards
    loadCards() {
        try {
            // Clear the existing cards in the container
            $('.card-section').empty();

            // Apply filters to get filtered data
            const filteredData = this.applyFilters();

            // Process each item in the filtered data
            filteredData.forEach(item => {
                const card = new Card(item, this.capabilities);
                
                // Append card to the container
                $('.card-section').append(card.toHTML());
            });

        } catch (error) {
            console.error('Error loading cards:', error);
        }
    }
}


// Card Object
class Card {
    constructor(item, capabilities) {
        this.data = item;
        this.capabilitiesData = capabilities || [];
    }

    // Gets the colour of the card using sector
    getColor() {
        const sector = this.data.sector.toLowerCase();

        if (sector.includes('energy') || sector.includes('utilities')) {
            return 'energy';
        } else if (sector.includes('natural environment')) {
            return 'natural';
        } else if (sector.includes('manufacturing')) {
            return 'manufacturing';
        } else if (sector.includes('transportation') || sector.includes('supply chain')) {
            return 'transportation';
        } else if (sector.includes('built environment')) {
            return 'built';
        } else if (sector.includes('health') || sector.includes('well-being')) {
            return 'health';
        } else if (sector.includes('government')) {
            return 'government';
        } else if (sector.includes('cross-cutting')) {
            return 'cross';
        } else {
            return 'energy'; // Default color
        }
    }

    // Get Capability Icon by ID
    getCapabilityIcon(capabilityId) {
        if (!capabilityId) return '';
        
        // Map capability ID to icon name using capabilities.json data
        const capability = this.capabilitiesData.find(cap => cap.id === capabilityId);
        const iconName = capability ? capability.icon : capabilityId;
        
        // Check if we should use a Font Awesome icon instead of an SVG file
        // by checking if the SVG file for this capability exists
        const fontAwesomeIcons = {
            'system_modelling': 'fa-solid fa-diagram-project',
            'data_integration': 'fa-solid fa-database',
            'predictive_analytics': 'fa-solid fa-chart-line',
            'anomaly_detection': 'fa-solid fa-triangle-exclamation',
            'decision_support': 'fa-solid fa-clipboard-check',
            'visual_spatial': 'fa-solid fa-map',
            'human_twin_interaction': 'fa-solid fa-user-gear',
            'twin_orchestration': 'fa-solid fa-cubes',
            'knowledge_representation': 'fa-solid fa-brain',
            'security_privacy': 'fa-solid fa-shield-halved',
            'realtime_monitoring': 'fa-solid fa-gauge-high',
            'vvuq': 'fa-solid fa-check-double',
            'optimisation': 'fa-solid fa-sliders'
        };
        
        if (fontAwesomeIcons[capabilityId]) {
            return fontAwesomeIcons[capabilityId];
        }
        
        // Default to the SVG file path if no Font Awesome icon is defined
        return this.getColor() + "/" + iconName + '.svg';
    }

    // Get Background Image based on sector
    getImg() {
        const sector = this.data.sector.toLowerCase();
        
        if (sector.includes('energy') || sector.includes('utilities')) {
            return 'Energy.svg';
        } else if (sector.includes('natural environment')) {
            return 'Natural_Environment.svg';
        } else if (sector.includes('manufacturing')) {
            return 'Manufacturing.svg';
        } else if (sector.includes('transportation') || sector.includes('supply chain')) {
            return 'Transportation.svg';
        } else if (sector.includes('built environment')) {
            return 'Built_Environment.svg';
        } else if (sector.includes('health') || sector.includes('well-being')) {
            return 'Health.svg';
        } else if (sector.includes('government')) {
            return 'Government.svg';
        } else if (sector.includes('cross-cutting')) {
            return 'Cross_Cutting.svg';
        } else {
            return 'Energy.svg'; // Default image
        }
    }

    // Check if capability exists at index
    hasCapability(index) {
        return this.data.capabilities && this.data.capabilities.length > index;
    }

    // Get capability at index
    getCapabilityAtIndex(index) {
        return this.data.capabilities && this.data.capabilities.length > index ? this.data.capabilities[index] : null;
    }

    // Get capability name by ID
    getCapabilityName(capabilityId) {
        if (!capabilityId) return '';
        
        const capability = this.capabilitiesData.find(cap => cap.id === capabilityId);
        return capability ? capability.name : capabilityId;
    }

    // HTML for the Star Ratings
    starRating(n) {
        const fillStar = '<img src="images/icons/fill-star.svg" alt="fill-star.svg" />';
        const emptyStar = '<img src="images/icons/star.svg" alt="star.svg" />';

        switch (n) {
            case 1:
                return `${fillStar} ${emptyStar} ${emptyStar}`;
            case 2:
                return `${fillStar} ${fillStar} ${emptyStar}`;
            case 3:
                return `${fillStar} ${fillStar} ${fillStar}`;
            default:
                return '';
        }
    }

    // Generate HTML for Card
    toHTML() {
        return `
      <div class="card fadeIn card-${this.getColor()}-text-bg">
        <div class="card-content">
          <div class="card-side card-${this.getColor()}-bg">
            <div class="control-system card-${this.getColor()}-bg">
              <div class="number">
                <h5 class="card-${this.getColor()}-text-bg">${this.data.number}</h5>
              </div>
              <span>${this.data.title}</span>
            </div>
            <div class="icon icon-1 card-${this.getColor()}-bg">
              <span data-bs-toggle="tooltip" data-bs-placement="right" title="${this.getCapabilityName(this.getCapabilityAtIndex(0))}">${this.getCapabilityIcon(this.getCapabilityAtIndex(0)).startsWith('fa-') 
                ? `<i class="${this.getCapabilityIcon(this.getCapabilityAtIndex(0))}"></i>` 
                : `<img src="images/icons/${this.getCapabilityIcon(this.getCapabilityAtIndex(0))}" />`}</span>
            </div>
            ${this.hasCapability(1) ? `
              <div class="icon icon-2 card-${this.getColor()}-bg">
              <span data-bs-toggle="tooltip" data-bs-placement="right" title="${this.getCapabilityName(this.getCapabilityAtIndex(1))}">${this.getCapabilityIcon(this.getCapabilityAtIndex(1)).startsWith('fa-') 
                ? `<i class="${this.getCapabilityIcon(this.getCapabilityAtIndex(1))}"></i>` 
                : `<img src="images/icons/${this.getCapabilityIcon(this.getCapabilityAtIndex(1))}" />`}</span>
            </div>` : ''}
            ${this.hasCapability(2) ? `
              <div class="icon icon-3 card-${this.getColor()}-bg">
              <span data-bs-toggle="tooltip" data-bs-placement="right" title="${this.getCapabilityName(this.getCapabilityAtIndex(2))}">${this.getCapabilityIcon(this.getCapabilityAtIndex(2)).startsWith('fa-') 
                ? `<i class="${this.getCapabilityIcon(this.getCapabilityAtIndex(2))}"></i>` 
                : `<img src="images/icons/${this.getCapabilityIcon(this.getCapabilityAtIndex(2))}" />`}</span>
            </div>` : ''}
          </div>

          <div class="card-content-img">
            <img src="images/${this.getImg()}" alt="" />
          </div>
          <div class="card-content-text card-${this.getColor()}-text-bg">
            <p>${this.data.description}</p>
            <div class="rating">
              <div class="rating-item card-${this.getColor()}-bg">
                <h6>Significance</h6>
                <div class="rating-icon">
                 ${this.starRating(this.data.significance)}
                </div>
              </div>
              <div class="rating-item card-${this.getColor()}-bg">
                <h6>Complexity</h6>
                <div class="rating-icon">
                 ${this.starRating(this.data.complexity)}
                </div>
              </div>
              <div class="rating-item card-${this.getColor()}-bg">
                <h6>Readiness</h6>
                <div class="rating-icon">
                 ${this.starRating(this.data.readiness)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }
}

// Launch loading cards and filter
$(document).ready(function() {

    const cardReader = new CardReader('data.json');
    cardReader.fetchData().then(() => {
        // Load cards after fetching data
        cardReader.loadCards();
    });

    setupFilters(cardReader);

});

// Setup filters
function setupFilters(cardReader) {

    $('#searchBox').on('input', function() {
        cardReader.filters.searchText = $(this).val();
        cardReader.loadCards();
    });

    $('.sector-filter').on('change', 'input[type="checkbox"]', function() {

        // Create an array to store selected sectors
        const selectedSectors = [];

        // Loop through all checkboxes and add selected sectors to the array
        $('.sector-filter input:checked').each(function() {
            selectedSectors.push($(this).val());
        });

        // Update the sector filter in the cardReader with the selected sectors
        cardReader.filters.sector = selectedSectors.length > 0 ? selectedSectors : null;

        // Load cards with the updated filters
        cardReader.loadCards();
    });


    $('.ai-capabilities-filter').on('change', 'input[type="checkbox"]', function() {

        // Create an array to store selected capabilities
        const selectedAICapabilities = [];

        // Loop through all checkboxes and add selected capabilities to the array
        $('.ai-capabilities-filter input:checked').each(function() {
            selectedAICapabilities.push($(this).val());
        });

        // Update the capabilities filter in the cardReader with the selected capabilities
        cardReader.filters.aiCapabilities = selectedAICapabilities.length > 0 ? selectedAICapabilities : null;

        // Load cards with the updated filters
        cardReader.loadCards();
    });

    $('.gc-filter').on('change', 'select', function() {
        cardReader.filters.challenge = $(this).val() == 'all' ? null : $(this).val();
        cardReader.loadCards();
    })

    $(".score").bind("change", function() {
        var name = jQuery(this).attr("name");

        // Map old score names to new ones
        if (name == "Novelty" || name == "Readiness") {
            cardReader.filters.scoreReadiness = jQuery(this).val() == "all" ? null : jQuery(this).val();
        }
        if (name == "AISuitability" || name == "Complexity") {
            cardReader.filters.scoreComplexity = jQuery(this).val() == "all" ? null : jQuery(this).val();
        }
        if (name == "Impact" || name == "Significance") {
            cardReader.filters.scoreSignificance = jQuery(this).val() == "all" ? null : jQuery(this).val();
        }

        // Load cards with the updated filters
        cardReader.loadCards();
    });

}

$(document).ready(function() {
    // Add click event listener to dynamically added star divs
    $('.scores-filter').on('click', '.btn-star', function() {
        var value = $(this).data("star");
        var currentStar = $(this);
        var starContainer = currentStar.closest('.d-flex');
        var hiddenInput = starContainer.find('input');

        if (currentStar.hasClass('score-selected')) {
            // Clicked on a star with the score-selected class
            // Remove score-selected class from other buttons in the same row
            starContainer.find('.btn-star').removeClass('score-selected');

            // Set the hidden input to ALL
            hiddenInput.val('all').trigger('change');
        } else {
            // Clicked on a star without the score-selected class

            // Remove score-selected class from other buttons in the same row
            starContainer.find('.btn-star').removeClass('score-selected');

            // Add score-selected class to the clicked star
            currentStar.addClass('score-selected');

            // Set the hidden input to the clicked star's number
            hiddenInput.val(value).trigger('change');
        }
    });
});

$(document).ready(function() {

    $('#toggler').click(function() {
        $('#toggler').toggleClass("arrow-down");
        $('#toggler').toggleClass("arrow-up");
    });

    $(function() {
        $('[data-bs-toggle="tooltip"]').tooltip();
    });
});

$(document).ready(function() {
    // Show/hide the button based on scroll position
    $(window).scroll(function() {
        if ($(this).scrollTop() > 100) {
            $('#scrollToTopBtn').fadeIn();
        } else {
            $('#scrollToTopBtn').fadeOut();
        }
    });

    // Scroll to top when the button is clicked
    $('#scrollToTopBtn').click(function() {
        $('html, body').animate({
            scrollTop: 0
        }, 'slow');
        return false;
    });

    // Scrolls to top when toggle up is clicked	
    $('#toggler').click(function() {
        if ($(this).hasClass("arrow-down")) {
            $('html, body').animate({
                scrollTop: 0
            }, 'slow');
            return false;
        }
    });
});
