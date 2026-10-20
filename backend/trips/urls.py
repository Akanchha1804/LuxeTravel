from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BookingViewSet,
    ChatRoomViewSet,
    DestinationViewSet,
    TripViewSet,
    UserActivityViewSet,
    create_trip_chatroom,
    fork_trip,
    health,
    login,
    logout,
    make_trip_public,
    me,
    signup,
    travel_flights,
    travel_hotels,
    view_shared_trip,
)

router = DefaultRouter()
router.register(r"trips", TripViewSet, basename="trip")
router.register(r"chatrooms", ChatRoomViewSet, basename="chatroom")
router.register(r"user-activities", UserActivityViewSet, basename="user-activity")
router.register(r"bookings", BookingViewSet, basename="booking")
router.register(r"destinations", DestinationViewSet, basename="destination")

urlpatterns = [
    path("", include(router.urls)),
    path("health/", health, name="health"),
    path("signup/", signup, name="signup"),
    path("login/", login, name="login"),
    path("logout/", logout, name="logout"),
    path("me/", me, name="me"),

    # Travel provider proxy (keeps Amadeus credentials server-side)
    path("travel/flights/", travel_flights, name="travel-flights"),
    path("travel/hotels/", travel_hotels, name="travel-hotels"),

    # Phase 4: Social & Collaboration
    path("trips/<int:trip_id>/make-public/", make_trip_public, name="make_trip_public"),
    path("trips/<int:trip_id>/create-chatroom/", create_trip_chatroom, name="create_trip_chatroom"),
    path("shared/<str:share_code>/", view_shared_trip, name="view_shared_trip"),
    path("shared/<str:share_code>/fork/", fork_trip, name="fork_trip"),
]
