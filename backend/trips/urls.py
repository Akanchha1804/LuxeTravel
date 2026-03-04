from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TripViewSet, ChatRoomViewSet, UserActivityViewSet, BookingViewSet, DestinationViewSet,
    signup, login, make_trip_public, view_shared_trip, fork_trip, create_trip_chatroom
)

router = DefaultRouter()
router.register(r'trips', TripViewSet)
router.register(r'chatrooms', ChatRoomViewSet)
router.register(r'user-activities', UserActivityViewSet)
router.register(r'bookings', BookingViewSet)
router.register(r'destinations', DestinationViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('signup/', signup, name='signup'),
    path('login/', login, name='login'),
    
    # Phase 4: Social & Collaboration
    path('trips/<int:trip_id>/make-public/', make_trip_public, name='make_trip_public'),
    path('trips/<int:trip_id>/create-chatroom/', create_trip_chatroom, name='create_trip_chatroom'),
    path('shared/<str:share_code>/', view_shared_trip, name='view_shared_trip'),
    path('shared/<str:share_code>/fork/', fork_trip, name='fork_trip'),
]
